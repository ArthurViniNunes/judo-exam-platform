import type { AuthUser } from "./contracts";
import { isValidEmail, normalizeEmail } from "./domain";
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
  const name = body.name?.trim().replace(/\s+/g, " ") || "";
  if (!isValidEmail(email)) {
    return json(request, env, { error: "Informe um e-mail válido." }, 400);
  }
  if (name.length < 3 || name.length > 80) {
    return json(
      request,
      env,
      { error: "Informe um nome entre 3 e 80 caracteres." },
      400,
    );
  }

  const existing = await env.DB.prepare(
    "SELECT id, email, name, role, status FROM users WHERE email = ?",
  )
    .bind(email)
    .first<{
      id: string;
      email: string;
      name: string;
      role: "super_admin" | "evaluator";
      status: "invited" | "active" | "disabled";
    }>();
  if (existing) {
    if (existing.status === "invited" && existing.role === "evaluator") {
      await env.DB.prepare("UPDATE users SET name = ? WHERE id = ?")
        .bind(name, existing.id)
        .run();
      return json(request, env, { ...existing, name });
    }

    const error =
      existing.status === "disabled"
        ? "Este e-mail pertence a um acesso desativado. Reative-o na lista da equipe."
        : "Este e-mail já possui uma conta ativa.";
    return json(
      request,
      env,
      { error },
      409,
    );
  }

  const invited = {
    id: crypto.randomUUID(),
    email,
    name,
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

export async function cancelInvitation(
  request: Request,
  env: Env,
  userId: string,
) {
  const invited = await env.DB.prepare(
    "SELECT role, status FROM users WHERE id = ?",
  )
    .bind(userId)
    .first<{ role: "super_admin" | "evaluator"; status: string }>();

  if (!invited) {
    return json(request, env, { error: "Convite não encontrado." }, 404);
  }
  if (invited.role !== "evaluator" || invited.status !== "invited") {
    return json(
      request,
      env,
      { error: "Somente convites pendentes podem ser cancelados." },
      409,
    );
  }

  await env.DB.prepare("DELETE FROM users WHERE id = ? AND status = 'invited'")
    .bind(userId)
    .run();
  return json(request, env, { ok: true });
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
