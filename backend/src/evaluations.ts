import type { AuthUser, EvaluationRow } from "./contracts";
import {
  dashboardFromRows,
  formatEvaluation,
  isEvaluation,
  normalizeName,
  studentsFromRows,
} from "./domain";
import { json } from "./http";

async function evaluationRows(
  env: Env,
  user: AuthUser,
  evaluatorId?: string | null,
) {
  const filterId = user.role === "super_admin" ? evaluatorId : user.id;
  const where = filterId ? "WHERE evaluations.evaluator_id = ?" : "";
  const statement = env.DB.prepare(
    `SELECT evaluations.*, users.name AS evaluator_name
     FROM evaluations
     LEFT JOIN users ON users.id = evaluations.evaluator_id
     ${where}
     ORDER BY evaluations.created_at DESC
     LIMIT 2000`,
  );
  const result = filterId
    ? await statement.bind(filterId).all<EvaluationRow>()
    : await statement.all<EvaluationRow>();
  return result.results;
}

export async function getDashboard(
  request: Request,
  env: Env,
  user: AuthUser,
  url: URL,
) {
  const rows = await evaluationRows(env, user, url.searchParams.get("evaluator"));
  return json(request, env, dashboardFromRows(rows));
}

export async function listStudents(
  request: Request,
  env: Env,
  user: AuthUser,
  url: URL,
) {
  const rows = await evaluationRows(env, user, url.searchParams.get("evaluator"));
  return json(request, env, studentsFromRows(rows));
}

export async function listEvaluations(
  request: Request,
  env: Env,
  user: AuthUser,
  url: URL,
) {
  const rows = await evaluationRows(env, user, url.searchParams.get("evaluator"));
  return json(request, env, rows.map(formatEvaluation));
}

export async function createEvaluation(
  request: Request,
  env: Env,
  user: AuthUser,
) {
  const body: unknown = await request.json();
  if (!isEvaluation(body)) {
    return json(
      request,
      env,
      { error: "Os dados da avaliação são inválidos." },
      400,
    );
  }

  const id = body.id || crypto.randomUUID();
  const duplicate = await env.DB.prepare(
    "SELECT * FROM evaluations WHERE id = ? AND evaluator_id = ?",
  )
    .bind(id, user.id)
    .first<EvaluationRow>();
  if (duplicate) return json(request, env, formatEvaluation(duplicate));

  const normalized = normalizeName(body.athlete);
  let student = await env.DB.prepare(
    "SELECT id FROM students WHERE normalized_name = ?",
  )
    .bind(normalized)
    .first<{ id: string }>();
  if (!student) {
    student = { id: crypto.randomUUID() };
    await env.DB.prepare(
      "INSERT INTO students (id, name, normalized_name) VALUES (?, ?, ?)",
    )
      .bind(student.id, body.athlete.trim(), normalized)
      .run();
  }

  const row = await env.DB.prepare(
    "INSERT INTO evaluations (id, athlete, student_id, evaluator_id, professor, belt, type, score, result, matrix_id, detail) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *",
  )
    .bind(
      id,
      body.athlete.trim(),
      student.id,
      user.id,
      user.name,
      body.belt.trim(),
      body.type,
      Math.round(body.score),
      body.result?.trim() || null,
      body.matrixId || null,
      body.detail?.trim() || null,
    )
    .first<EvaluationRow>();

  return json(
    request,
    env,
    formatEvaluation({ ...row!, evaluator_name: user.name }),
    201,
  );
}
