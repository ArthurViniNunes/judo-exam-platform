import type { AuthUser } from "./contracts";
import { normalizeEmail } from "./domain";
import { json } from "./http";

export async function listUsers(request: Request, env: Env) {
  const result = await env.DB.prepare(
    "SELECT users.id, users.email, users.name, users.role, users.status, users.created_at, users.last_login_at, COUNT(evaluations.id) AS evaluation_count, COUNT(DISTINCT evaluations.student_id) AS student_count, COALESCE(ROUND(AVG(evaluations.score)), 0) AS average_score FROM users LEFT JOIN evaluations ON evaluations.evaluator_id = users.id GROUP BY users.id ORDER BY users.role, users.name",
  ).all();
  return json(request, env, result.results);
}

export async function inviteUser(request: Request, env: Env) {
  const body = await request.json<{ email?: string; name?: string }>();
  const email = normalizeEmail(body.email || "");
  if (!email.includes("@")) {
    return json(request, env, { error: "Informe um e-mail válido." }, 400);
  }

  const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ?")
    .bind(email)
    .first();
  if (existing) {
    return json(
      request,
      env,
      { error: "Este e-mail já está cadastrado ou convidado." },
      409,
    );
  }

  const invited = {
    id: crypto.randomUUID(),
    email,
    name: body.name?.trim() || "Avaliador convidado",
  };
  await env.DB.prepare(
    "INSERT INTO users (id, email, name, role, status) VALUES (?, ?, ?, 'evaluator', 'invited')",
  )
    .bind(invited.id, invited.email, invited.name)
    .run();
  return json(
    request,
    env,
    { ...invited, role: "evaluator", status: "invited" },
    201,
  );
}

export async function updateUserStatus(
  request: Request,
  env: Env,
  currentUser: AuthUser,
  userId: string,
) {
  if (userId === currentUser.id) {
    return json(
      request,
      env,
      { error: "O Super Admin não pode desativar a própria conta." },
      400,
    );
  }
  const body = await request.json<{ status?: "active" | "disabled" }>();
  if (!body.status || !["active", "disabled"].includes(body.status)) {
    return json(request, env, { error: "Status inválido." }, 400);
  }
  await env.DB.prepare(
    "UPDATE users SET status = ? WHERE id = ? AND role = 'evaluator'",
  )
    .bind(body.status, userId)
    .run();
  return json(request, env, { ok: true });
}
