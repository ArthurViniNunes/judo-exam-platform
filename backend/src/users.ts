import type { AuthUser } from "./contracts";
import { isValidEmail, normalizeEmail } from "./domain";
import { json } from "./http";
import { isEvaluatorRank } from "../../lib/judo-ranks";

export async function listUsers(request: Request, env: Env) {
  const result = await env.DB.prepare(
    `SELECT users.id, users.email, users.name, users.evaluator_rank,
            CASE
              WHEN EXISTS (
                SELECT 1 FROM user_roles
                 WHERE user_roles.user_id = users.id
                   AND user_roles.role = 'super_admin'
              ) THEN 'super_admin'
              ELSE 'evaluator'
            END AS role,
            CASE
              WHEN EXISTS (
                SELECT 1 FROM user_roles
                 WHERE user_roles.user_id = users.id
                   AND user_roles.role = 'super_admin'
              ) THEN (
                SELECT status FROM user_roles
                 WHERE user_roles.user_id = users.id
                   AND user_roles.role = 'super_admin'
              )
              ELSE (
                SELECT status FROM user_roles
                 WHERE user_roles.user_id = users.id
                   AND user_roles.role = 'evaluator'
              )
            END AS status,
            users.created_at, users.last_login_at,
            COUNT(evaluations.id) AS evaluation_count,
            COUNT(DISTINCT evaluations.student_id) AS student_count,
            COALESCE(ROUND(AVG(evaluations.score)), 0) AS average_score
       FROM users
       LEFT JOIN evaluations
         ON evaluations.evaluator_id = users.id
        AND evaluations.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM evaluations AS newer
           WHERE newer.revision_root_id = COALESCE(evaluations.revision_root_id, evaluations.id)
             AND newer.revision_number > evaluations.revision_number
             AND newer.deleted_at IS NULL
        )
      WHERE EXISTS (
        SELECT 1 FROM user_roles
         WHERE user_roles.user_id = users.id
           AND user_roles.role IN ('super_admin', 'evaluator')
      )
      GROUP BY users.id
      ORDER BY role, users.name`,
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
    `SELECT users.id, users.email, users.name, users.evaluator_rank,
            users.password_hash, users.status AS identity_status,
            evaluator_role.status AS evaluator_status,
            EXISTS (
              SELECT 1 FROM user_roles
               WHERE user_roles.user_id = users.id
                 AND user_roles.role = 'super_admin'
            ) AS has_super_admin
       FROM users
       LEFT JOIN user_roles AS evaluator_role
         ON evaluator_role.user_id = users.id
        AND evaluator_role.role = 'evaluator'
      WHERE users.email = ?`,
  )
    .bind(email)
    .first<{
      id: string;
      email: string;
      name: string;
      evaluator_rank: string | null;
      password_hash: string | null;
      identity_status: "invited" | "active" | "disabled";
      evaluator_status: "invited" | "active" | "disabled" | null;
      has_super_admin: number;
    }>();
  if (existing) {
    if (existing.has_super_admin) {
      return json(
        request,
        env,
        { error: "Este e-mail já possui acesso de Super Admin." },
        409,
      );
    }
    if (existing.evaluator_status === "invited") {
      await env.DB.batch([
        env.DB.prepare(
          "UPDATE users SET name = ?, evaluator_rank = ? WHERE id = ?",
        ).bind(name, evaluatorRank, existing.id),
        env.DB.prepare(
          "UPDATE user_roles SET updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND role = 'evaluator'",
        ).bind(existing.id),
      ]);
      return json(request, env, {
        ...existing,
        name,
        evaluator_rank: evaluatorRank,
        role: "evaluator",
        status: "invited",
      });
    }
    if (existing.evaluator_status === "active") {
      return json(request, env, { error: "Este e-mail já possui acesso de avaliador." }, 409);
    }
    if (existing.evaluator_status === "disabled") {
      return json(
        request,
        env,
        { error: "Este avaliador está desativado. Reative-o na lista da equipe." },
        409,
      );
    }

    const evaluatorStatus = existing.password_hash ? "active" : "invited";
    await env.DB.batch([
      env.DB.prepare(
        "UPDATE users SET name = ?, evaluator_rank = ?, status = 'active' WHERE id = ?",
      ).bind(name, evaluatorRank, existing.id),
      env.DB.prepare(
        "INSERT INTO user_roles (user_id, role, status) VALUES (?, 'evaluator', ?)",
      ).bind(existing.id, evaluatorStatus),
    ]);
    return json(
      request,
      env,
      {
        id: existing.id,
        email,
        name,
        evaluator_rank: evaluatorRank,
        role: "evaluator",
        status: evaluatorStatus,
      },
      201,
    );
  }

  const invited = {
    id: crypto.randomUUID(),
    email,
    name,
    evaluator_rank: evaluatorRank,
  };
  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO users (id, email, name, evaluator_rank, role, status) VALUES (?, ?, ?, ?, 'evaluator', 'invited')",
    ).bind(invited.id, invited.email, invited.name, invited.evaluator_rank),
    env.DB.prepare(
      "INSERT INTO user_roles (user_id, role, status) VALUES (?, 'evaluator', 'invited')",
    ).bind(invited.id),
  ]);
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
    "SELECT role, status FROM user_roles WHERE user_id = ? AND role = 'evaluator'",
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

  await env.DB.batch([
    env.DB.prepare(
      "DELETE FROM user_roles WHERE user_id = ? AND role = 'evaluator' AND status = 'invited'",
    ).bind(userId),
    env.DB.prepare(
      `DELETE FROM users
        WHERE id = ?
          AND password_hash IS NULL
          AND NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = ?)`,
    ).bind(userId, userId),
  ]);
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

  const evaluatorRole = await env.DB.prepare(
    "SELECT status FROM user_roles WHERE user_id = ? AND role = 'evaluator'",
  )
    .bind(userId)
    .first<{ status: string }>();
  if (!evaluatorRole) {
    return json(request, env, { error: "Avaliador não encontrado." }, 404);
  }

  const statements: D1PreparedStatement[] = [];
  if (hasRank) {
    statements.push(
      env.DB.prepare("UPDATE users SET evaluator_rank = ? WHERE id = ?").bind(
        body.evaluatorRank,
        userId,
      ),
    );
  }
  if (hasStatus) {
    statements.push(
      env.DB.prepare(
        "UPDATE user_roles SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND role = 'evaluator'",
      ).bind(body.status, userId),
    );
    if (body.status === "active") {
      statements.push(
        env.DB.prepare("UPDATE users SET status = 'active' WHERE id = ?").bind(userId),
      );
    } else {
      statements.push(
        env.DB.prepare(
          `UPDATE users
              SET status = CASE
                WHEN EXISTS (
                  SELECT 1 FROM user_roles
                   WHERE user_roles.user_id = users.id
                     AND user_roles.role <> 'evaluator'
                     AND user_roles.status = 'active'
                ) THEN 'active'
                ELSE 'disabled'
              END
            WHERE id = ?`,
        ).bind(userId),
      );
    }
  }
  await env.DB.batch(statements);
  return json(request, env, { ok: true });
}
