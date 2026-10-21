import type { AuthUser } from "./contracts";
import { isValidEmail, normalizeEmail } from "./domain";
import { json } from "./http";
import { isEvaluatorRank } from "../../lib/judo-ranks";

export async function listUsers(request: Request, env: Env) {
  const result = await env.DB.prepare(
    "SELECT users.id, users.email, users.name, users.evaluator_rank, users.role, users.status, users.created_at, users.last_login_at, COUNT(evaluations.id) AS evaluation_count, COUNT(DISTINCT evaluations.student_id) AS student_count, COALESCE(ROUND(AVG(evaluations.score)), 0) AS average_score FROM users LEFT JOIN evaluations ON evaluations.evaluator_id = users.id GROUP BY users.id ORDER BY users.role, users.name",
  ).all();
  return json(request, env, result.results);
}

export async function inviteUser(request: Request, env: Env) {
  const body = await request.json<{
    email?: string;
    name?: string;
    evaluatorRank?: string;
  }>();
  const email = normalizeEmail(body.email || "");
  const name = body.name?.trim().replace(/\s+/g, " ") || "";
  const evaluatorRank = body.evaluatorRank?.trim() || "";
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
  if (!isEvaluatorRank(evaluatorRank)) {
    return json(request, env, { error: "Selecione a graduação do avaliador." }, 400);
  }

  const existing = await env.DB.prepare(
    "SELECT id, email, name, evaluator_rank, role, status FROM users WHERE email = ?",
  )
    .bind(email)
    .first<{
      id: string;
      email: string;
      name: string;
      evaluator_rank: string | null;
      role: "super_admin" | "evaluator";
      status: "invited" | "active" | "disabled";
    }>();
  if (existing) {
    if (existing.status === "invited" && existing.role === "evaluator") {
      await env.DB.prepare(
        "UPDATE users SET name = ?, evaluator_rank = ? WHERE id = ?",
      )
        .bind(name, evaluatorRank, existing.id)
        .run();
      return json(request, env, {
        ...existing,
        name,
        evaluator_rank: evaluatorRank,
      });
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
    evaluator_rank: evaluatorRank,
  };
  await env.DB.prepare(
    "INSERT INTO users (id, email, name, evaluator_rank, role, status) VALUES (?, ?, ?, ?, 'evaluator', 'invited')",
  )
    .bind(invited.id, invited.email, invited.name, invited.evaluator_rank)
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
  const body = await request.json<{
    status?: "active" | "disabled";
    evaluatorRank?: string;
  }>();
  if (body.status && userId === currentUser.id) {
    return json(
      request,
      env,
      { error: "O Super Admin não pode desativar a própria conta." },
      400,
    );
  }
  const hasStatus = body.status !== undefined;
  const hasRank = body.evaluatorRank !== undefined;
  if (!hasStatus && !hasRank) {
    return json(request, env, { error: "Nenhuma alteração foi informada." }, 400);
  }
  if (hasStatus && !["active", "disabled"].includes(body.status!)) {
    return json(request, env, { error: "Status inválido." }, 400);
  }
  if (hasRank && !isEvaluatorRank(body.evaluatorRank)) {
    return json(request, env, { error: "Graduação inválida." }, 400);
  }

  if (hasStatus && hasRank) {
    await env.DB.prepare(
      "UPDATE users SET status = ?, evaluator_rank = ? WHERE id = ? AND role = 'evaluator'",
    )
      .bind(body.status, body.evaluatorRank, userId)
      .run();
  } else if (hasStatus) {
    await env.DB.prepare(
      "UPDATE users SET status = ? WHERE id = ? AND role = 'evaluator'",
    )
      .bind(body.status, userId)
      .run();
  } else {
    await env.DB.prepare(
      "UPDATE users SET evaluator_rank = ? WHERE id = ? AND role = 'evaluator'",
    )
      .bind(body.evaluatorRank, userId)
      .run();
  }
  return json(request, env, { ok: true });
}
