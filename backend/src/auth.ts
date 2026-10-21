import type { AuthUser, Role } from "./contracts";
import { normalizeEmail, publicUser } from "./domain";
import { empty, json } from "./http";
import {
  createSession,
  derivePassword,
  ensureSuperAdmin,
  revokeSession,
  secureEqual,
  validPassword,
} from "./security";

export async function login(request: Request, env: Env) {
  await ensureSuperAdmin(env);
  const body = await request.json<{ email?: string; password?: string }>();
  const user = await env.DB.prepare(
    "SELECT id, email, name, evaluator_rank, role, status, password_hash, password_salt FROM users WHERE email = ?",
  )
    .bind(normalizeEmail(body.email || ""))
    .first<
      AuthUser & { password_hash: string | null; password_salt: string | null }
    >();

  if (!user?.password_hash || !user.password_salt || user.status !== "active") {
    return json(request, env, { error: "E-mail ou senha inválidos." }, 401);
  }

  const candidate = await derivePassword(body.password || "", user.password_salt);
  if (!secureEqual(candidate.hash, user.password_hash)) {
    return json(request, env, { error: "E-mail ou senha inválidos." }, 401);
  }

  const session = await createSession(env, user.id);
  await env.DB.prepare(
    "UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?",
  )
    .bind(user.id)
    .run();

  return json(request, env, { ...session, user: publicUser(user) });
}

export async function register(request: Request, env: Env) {
  await ensureSuperAdmin(env);
  const body = await request.json<{
    name?: string;
    email?: string;
    password?: string;
  }>();
  const name = body.name?.trim() || "";
  const email = normalizeEmail(body.email || "");
  const password = body.password || "";
  if (name.length < 3 || !email.includes("@")) {
    return json(
      request,
      env,
      { error: "Informe seu nome completo e um e-mail válido." },
      400,
    );
  }
  if (!validPassword(password)) {
    return json(
      request,
      env,
      { error: "A senha deve ter pelo menos 10 caracteres, uma letra e um número." },
      400,
    );
  }

  const invited = await env.DB.prepare(
    "SELECT id, email, evaluator_rank, role, status, password_hash FROM users WHERE email = ?",
  )
    .bind(email)
    .first<{
      id: string;
      email: string;
      evaluator_rank: string | null;
      role: Role;
      status: AuthUser["status"];
      password_hash: string | null;
    }>();

  if (!invited) {
    return json(
      request,
      env,
      {
        error:
          "Este e-mail ainda não foi autorizado. Peça ao Super Admin para adicioná-lo.",
      },
      403,
    );
  }
  if (invited.status === "disabled") {
    return json(
      request,
      env,
      { error: "Este acesso está desativado. Fale com o Super Admin." },
      403,
    );
  }
  if (invited.password_hash) {
    return json(
      request,
      env,
      { error: "Esta conta já foi criada. Entre com sua senha." },
      409,
    );
  }

  const credentials = await derivePassword(password);
  await env.DB.prepare(
    "UPDATE users SET name = ?, password_hash = ?, password_salt = ?, status = 'active', last_login_at = CURRENT_TIMESTAMP WHERE id = ?",
  )
    .bind(name, credentials.hash, credentials.salt, invited.id)
    .run();

  const session = await createSession(env, invited.id);
  return json(
    request,
    env,
    {
      ...session,
      user: {
        id: invited.id,
        email,
        name,
        evaluatorRank: invited.evaluator_rank,
        role: invited.role,
      },
    },
    201,
  );
}

export async function updateProfile(
  request: Request,
  env: Env,
  user: AuthUser,
) {
  const body = await request.json<{ name?: string }>();
  const name = body.name?.trim().replace(/\s+/g, " ") || "";
  if (name.length < 3 || name.length > 80) {
    return json(
      request,
      env,
      { error: "Informe um nome entre 3 e 80 caracteres." },
      400,
    );
  }
  await env.DB.prepare("UPDATE users SET name = ? WHERE id = ?")
    .bind(name, user.id)
    .run();
  return json(request, env, { user: publicUser({ ...user, name }) });
}

export async function logout(request: Request, env: Env) {
  await revokeSession(request, env);
  return empty(request, env);
}
