import type { AuthUser, SessionContext, UserStatus } from "./contracts";
import { activeRoleForContext, normalizeEmail, rolesFromCsv } from "./domain";

const encoder = new TextEncoder();
const sessionDurationMs = 7 * 24 * 60 * 60 * 1000;

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex: string) {
  return new Uint8Array(
    (hex.match(/.{1,2}/g) ?? []).map((pair) => Number.parseInt(pair, 16)),
  );
}

function randomHex(size = 32) {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(size)));
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return bytesToHex(new Uint8Array(digest));
}

export async function derivePassword(password: string, saltHex?: string) {
  const salt = saltHex
    ? hexToBytes(saltHex)
    : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: 100_000 },
    key,
    256,
  );
  return { hash: bytesToHex(new Uint8Array(bits)), salt: bytesToHex(salt) };
}

export function secureEqual(leftHex: string, rightHex: string) {
  const left = hexToBytes(leftHex);
  const right = hexToBytes(rightHex);
  const subtle = crypto.subtle as SubtleCrypto & {
    timingSafeEqual(left: BufferSource, right: BufferSource): boolean;
  };
  return left.byteLength === right.byteLength && subtle.timingSafeEqual(left, right);
}

export function validPassword(password: string) {
  return password.length >= 10 && /[A-Za-zÀ-ÿ]/.test(password) && /\d/.test(password);
}

export async function ensureSuperAdmin(env: Env) {
  const email = normalizeEmail(env.SUPER_ADMIN_EMAIL || "");
  const password = env.SUPER_ADMIN_INITIAL_PASSWORD;
  if (!email || !password) return;

  const existing = await env.DB.prepare(
    "SELECT id, password_hash FROM users WHERE email = ?",
  )
    .bind(email)
    .first<{ id: string; password_hash: string | null }>();
  if (existing?.password_hash) {
    await env.DB.batch([
      env.DB.prepare(
        "UPDATE users SET role = 'super_admin', status = 'active' WHERE id = ?",
      ).bind(existing.id),
      env.DB.prepare(
        "INSERT INTO user_roles (user_id, role, status, updated_at) VALUES (?, 'super_admin', 'active', CURRENT_TIMESTAMP) ON CONFLICT(user_id, role) DO UPDATE SET status = 'active', updated_at = CURRENT_TIMESTAMP",
      ).bind(existing.id),
    ]);
    return;
  }

  const credentials = await derivePassword(password);
  if (existing) {
    await env.DB.batch([
      env.DB.prepare(
        "UPDATE users SET password_hash = ?, password_salt = ?, role = 'super_admin', status = 'active' WHERE id = ?",
      ).bind(credentials.hash, credentials.salt, existing.id),
      env.DB.prepare(
        "INSERT INTO user_roles (user_id, role, status, updated_at) VALUES (?, 'super_admin', 'active', CURRENT_TIMESTAMP) ON CONFLICT(user_id, role) DO UPDATE SET status = 'active', updated_at = CURRENT_TIMESTAMP",
      ).bind(existing.id),
    ]);
    return;
  }

  const userId = crypto.randomUUID();
  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO users (id, email, name, password_hash, password_salt, role, status) VALUES (?, ?, ?, ?, ?, 'super_admin', 'active')",
    ).bind(userId, email, "Super Admin", credentials.hash, credentials.salt),
    env.DB.prepare(
      "INSERT INTO user_roles (user_id, role, status) VALUES (?, 'super_admin', 'active')",
    ).bind(userId),
  ]);
}

export async function createSession(
  env: Env,
  userId: string,
  context: SessionContext,
) {
  const token = randomHex();
  const tokenHash = await sha256(token);
  const expiresAt = new Date(Date.now() + sessionDurationMs).toISOString();
  await env.DB.prepare(
    "INSERT INTO sessions (token_hash, user_id, expires_at, context) VALUES (?, ?, ?, ?)",
  )
    .bind(tokenHash, userId, expiresAt, context)
    .run();
  return { token, expiresAt };
}

export async function authenticate(
  request: Request,
  env: Env,
): Promise<AuthUser | null> {
  const authorization = request.headers.get("Authorization") || "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : "";
  if (!token) return null;

  const row = await env.DB.prepare(
    `SELECT users.id, users.email, users.name, users.evaluator_rank,
            users.status, sessions.context, students.id AS student_id,
            (SELECT GROUP_CONCAT(user_roles.role)
             FROM user_roles
             WHERE user_roles.user_id = users.id
               AND user_roles.status = 'active') AS active_roles
       FROM sessions
       JOIN users ON users.id = sessions.user_id
       LEFT JOIN students ON students.user_id = users.id
      WHERE sessions.token_hash = ?
        AND sessions.expires_at > ?
        AND users.status = 'active'`,
  )
    .bind(await sha256(token), new Date().toISOString())
    .first<{
      id: string;
      email: string;
      name: string;
      evaluator_rank: string | null;
      status: UserStatus;
      context: SessionContext;
      student_id: string | null;
      active_roles: string | null;
    }>();
  if (!row) return null;

  const roles = rolesFromCsv(row.active_roles);
  const role = activeRoleForContext(roles, row.context);
  if (!role) return null;
  return { ...row, role, roles };
}

export async function revokeSession(request: Request, env: Env) {
  const token = request.headers.get("Authorization")?.slice(7).trim();
  if (!token) return;
  await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?")
    .bind(await sha256(token))
    .run();
}
