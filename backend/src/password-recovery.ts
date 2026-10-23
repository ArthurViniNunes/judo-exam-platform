import { systemAuditStatement } from "./audit";
import { normalizeEmail } from "./domain";
import { getEmailProvider } from "./email";
import { json } from "./http";
import { derivePassword, validPassword } from "./security";

const encoder = new TextEncoder();
const PUBLIC_RESPONSE = {
  message: "Se existir uma conta ativa para este e-mail, enviaremos as instruções de recuperação.",
};

type ResettableUser = {
  id: string;
  email: string;
  name: string;
};

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return bytesToHex(new Uint8Array(digest));
}

function randomToken() {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
}

function clientAddress(request: Request) {
  return request.headers.get("CF-Connecting-IP")
    || request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim()
    || "unknown";
}

async function rateLimitScopes(request: Request, env: Env, email: string) {
  const pepper = env.PASSWORD_RESET_PEPPER || env.BREVO_API_KEY || "password-reset";
  const [ipScope, emailScope] = await Promise.all([
    sha256(`${pepper}:ip:${clientAddress(request)}`),
    sha256(`${pepper}:email:${email}`),
  ]);
  const [ipCount, emailCount] = await Promise.all([
    env.DB.prepare(
      "SELECT COUNT(*) AS total FROM password_reset_attempts WHERE scope_hash = ? AND created_at >= datetime('now', '-1 hour')",
    ).bind(ipScope).first<{ total: number }>(),
    env.DB.prepare(
      "SELECT COUNT(*) AS total FROM password_reset_attempts WHERE scope_hash = ? AND created_at >= datetime('now', '-1 hour')",
    ).bind(emailScope).first<{ total: number }>(),
  ]);
  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO password_reset_attempts (id, scope_hash) VALUES (?, ?)",
    ).bind(crypto.randomUUID(), ipScope),
    env.DB.prepare(
      "INSERT INTO password_reset_attempts (id, scope_hash) VALUES (?, ?)",
    ).bind(crypto.randomUUID(), emailScope),
    env.DB.prepare(
      "DELETE FROM password_reset_attempts WHERE created_at < datetime('now', '-2 days')",
    ),
  ]);
  return Number(ipCount?.total ?? 0) < 5 && Number(emailCount?.total ?? 0) < 3;
}

function publicAppUrl(env: Env, token: string) {
  try {
    const url = new URL(env.PUBLIC_APP_URL);
    url.pathname = "/";
    url.search = "";
    url.searchParams.set("recuperar", token);
    return url.toString();
  } catch {
    return null;
  }
}

async function deliverResetEmail(
  request: Request,
  env: Env,
  user: ResettableUser,
  tokenId: string,
  resetUrl: string,
) {
  const provider = getEmailProvider(env);
  if (!provider) return;
  try {
    await provider.sendPasswordReset({
      recipientEmail: user.email,
      recipientName: user.name,
      resetUrl,
    });
    await systemAuditStatement(
      request,
      env,
      "password_reset.email_sent",
      "user",
      user.id,
    ).run();
  } catch {
    await env.DB.batch([
      env.DB.prepare(
        "UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = ? AND used_at IS NULL",
      ).bind(tokenId),
      systemAuditStatement(
        request,
        env,
        "password_reset.email_failed",
        "user",
        user.id,
      ),
    ]);
  }
}

export async function requestPasswordReset(
  request: Request,
  env: Env,
  context: ExecutionContext,
) {
  const body: { email?: unknown } = await request
    .json<{ email?: unknown }>()
    .catch(() => ({}));
  const email = normalizeEmail(typeof body.email === "string" ? body.email : "");
  const allowed = await rateLimitScopes(request, env, email);
  if (!allowed || !email.includes("@")) {
    return json(request, env, PUBLIC_RESPONSE, 202);
  }

  const user = await env.DB.prepare(
    "SELECT id, email, name FROM users WHERE email = ? AND status = 'active' AND password_hash IS NOT NULL",
  ).bind(email).first<ResettableUser>();
  const provider = getEmailProvider(env);
  if (!user || !provider) {
    return json(request, env, PUBLIC_RESPONSE, 202);
  }

  const token = randomToken();
  const tokenHash = await sha256(token);
  const tokenId = crypto.randomUUID();
  const resetUrl = publicAppUrl(env, token);
  if (!resetUrl) {
    await systemAuditStatement(
      request,
      env,
      "password_reset.configuration_error",
      "user",
      user.id,
    ).run();
    return json(request, env, PUBLIC_RESPONSE, 202);
  }

  await env.DB.batch([
    env.DB.prepare(
      "UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE user_id = ? AND used_at IS NULL",
    ).bind(user.id),
    env.DB.prepare(
      "INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, datetime('now', '+20 minutes'))",
    ).bind(tokenId, user.id, tokenHash),
    systemAuditStatement(
      request,
      env,
      "password_reset.requested",
      "user",
      user.id,
    ),
  ]);
  context.waitUntil(deliverResetEmail(request, env, user, tokenId, resetUrl));
  return json(request, env, PUBLIC_RESPONSE, 202);
}

export async function confirmPasswordReset(request: Request, env: Env) {
  const body: { token?: unknown; password?: unknown } = await request
    .json<{ token?: unknown; password?: unknown }>()
    .catch(() => ({}));
  const token = typeof body.token === "string" ? body.token.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!/^[a-f0-9]{64}$/.test(token) || !validPassword(password)) {
    return json(
      request,
      env,
      { error: "O link é inválido ou a nova senha não atende aos requisitos." },
      400,
    );
  }

  const tokenHash = await sha256(token);
  const reset = await env.DB.prepare(
    `SELECT password_reset_tokens.id, password_reset_tokens.user_id
       FROM password_reset_tokens
       JOIN users ON users.id = password_reset_tokens.user_id
      WHERE password_reset_tokens.token_hash = ?
        AND password_reset_tokens.used_at IS NULL
        AND datetime(password_reset_tokens.expires_at) > CURRENT_TIMESTAMP
        AND users.status = 'active'`,
  ).bind(tokenHash).first<{ id: string; user_id: string }>();
  if (!reset) {
    return json(request, env, { error: "Este link é inválido, expirou ou já foi utilizado." }, 400);
  }

  const claimed = await env.DB.prepare(
    `UPDATE password_reset_tokens
        SET used_at = CURRENT_TIMESTAMP
      WHERE id = ? AND used_at IS NULL AND datetime(expires_at) > CURRENT_TIMESTAMP`,
  ).bind(reset.id).run();
  if (Number(claimed.meta.changes ?? 0) !== 1) {
    return json(request, env, { error: "Este link é inválido, expirou ou já foi utilizado." }, 400);
  }

  const credentials = await derivePassword(password);
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?",
    ).bind(credentials.hash, credentials.salt, reset.user_id),
    env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(reset.user_id),
    env.DB.prepare(
      "UPDATE password_reset_tokens SET used_at = COALESCE(used_at, CURRENT_TIMESTAMP) WHERE user_id = ?",
    ).bind(reset.user_id),
    systemAuditStatement(
      request,
      env,
      "password_reset.completed",
      "user",
      reset.user_id,
    ),
  ]);
  return json(request, env, {
    message: "Senha redefinida. Entre novamente usando a nova senha.",
  });
}
