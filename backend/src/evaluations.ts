import type {
  AuthUser,
  EvaluationItemRow,
  EvaluationRow,
  StudentRow,
} from "./contracts";
import {
  canDeleteEvaluation,
  dashboardFromRows,
  formatEvaluation,
  isEvaluation,
  normalizeName,
  studentsFromCatalog,
} from "./domain";
import { empty, json } from "./http";

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
  const itemStatement = env.DB.prepare(
    `SELECT evaluation_items.*
     FROM evaluation_items
     INNER JOIN evaluations
       ON evaluations.id = evaluation_items.evaluation_id
     ${where}
     ORDER BY evaluation_items.position`,
  );
  const [result, itemResult] = filterId
    ? await Promise.all([
        statement.bind(filterId).all<EvaluationRow>(),
        itemStatement.bind(filterId).all<EvaluationItemRow>(),
      ])
    : await Promise.all([
        statement.all<EvaluationRow>(),
        itemStatement.all<EvaluationItemRow>(),
      ]);
  const itemsByEvaluation = new Map<string, EvaluationItemRow[]>();
  for (const item of itemResult.results) {
    const items = itemsByEvaluation.get(item.evaluation_id) ?? [];
    items.push(item);
    itemsByEvaluation.set(item.evaluation_id, items);
  }
  return result.results.map((row) => ({
    ...row,
    items: itemsByEvaluation.get(row.id) ?? [],
  }));
}

async function evaluationItems(env: Env, evaluationId: string) {
  const result = await env.DB.prepare(
    "SELECT * FROM evaluation_items WHERE evaluation_id = ? ORDER BY position",
  )
    .bind(evaluationId)
    .all<EvaluationItemRow>();
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
  const requestedEvaluator = url.searchParams.get("evaluator");
  const evaluatorId = user.role === "super_admin" ? requestedEvaluator : user.id;
  const statement = evaluatorId
    ? env.DB.prepare(
        `SELECT students.* FROM students
         INNER JOIN student_evaluators
           ON student_evaluators.student_id = students.id
         WHERE student_evaluators.evaluator_id = ?
         ORDER BY students.name`,
      ).bind(evaluatorId)
    : env.DB.prepare("SELECT * FROM students ORDER BY name");
  const [catalogResult, rows] = await Promise.all([
    statement.all<StudentRow>(),
    evaluationRows(env, user, requestedEvaluator),
  ]);
  return json(request, env, studentsFromCatalog(catalogResult.results, rows));
}

export async function listAvailableStudents(request: Request, env: Env) {
  const result = await env.DB.prepare(
    "SELECT id, name FROM students ORDER BY name",
  ).all<Pick<StudentRow, "id" | "name">>();
  return json(request, env, result.results);
}

export async function createStudent(
  request: Request,
  env: Env,
) {
  const body = await request.json<{ name?: string }>();
  const name = body.name?.trim().replace(/\s+/g, " ") || "";
  if (name.length < 3 || name.length > 100) {
    return json(
      request,
      env,
      { error: "Informe um nome entre 3 e 100 caracteres." },
      400,
    );
  }

  const normalized = normalizeName(name);
  const existingStudent = await env.DB.prepare(
    "SELECT * FROM students WHERE normalized_name = ?",
  )
    .bind(normalized)
    .first<StudentRow>();
  if (existingStudent) {
    return json(
      request,
      env,
      { error: "Este judoca já está cadastrado." },
      409,
    );
  }

  const id = crypto.randomUUID();
  const student = await env.DB.prepare(
    "INSERT INTO students (id, name, normalized_name) VALUES (?, ?, ?) RETURNING *",
  )
    .bind(id, name, normalized)
    .first<StudentRow>();

  return json(request, env, { id: student!.id, name: student!.name }, 201);
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
  if (duplicate) {
    const items = await evaluationItems(env, duplicate.id);
    return json(request, env, formatEvaluation({ ...duplicate, items }));
  }

  const student = await env.DB.prepare("SELECT * FROM students WHERE id = ?")
    .bind(body.studentId.trim())
    .first<StudentRow>();

  if (!student) {
    return json(
      request,
      env,
      { error: "Selecione um judoca previamente cadastrado." },
      400,
    );
  }

  const statements = [
    env.DB.prepare(
      "INSERT OR IGNORE INTO student_evaluators (student_id, evaluator_id) VALUES (?, ?)",
    ).bind(student.id, user.id),
    env.DB.prepare(
      "INSERT INTO evaluations (id, athlete, student_id, evaluator_id, professor, belt, type, score, result, matrix_id, detail) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ).bind(
      id,
      student.name,
      student.id,
      user.id,
      user.name,
      body.belt.trim(),
      body.type,
      Math.round(body.score),
      body.result?.trim() || null,
      body.matrixId || null,
      body.detail?.trim() || null,
    ),
    ...(body.items ?? []).map((item, position) =>
      env.DB.prepare(
        "INSERT INTO evaluation_items (id, evaluation_id, category, name, score, detail, position) VALUES (?, ?, ?, ?, ?, ?, ?)",
      ).bind(
        crypto.randomUUID(),
        id,
        item.category.trim(),
        item.name.trim(),
        Math.round(item.score * 10) / 10,
        item.detail?.trim() || null,
        position,
      ),
    ),
  ];
  await env.DB.batch(statements);
  const [row, items] = await Promise.all([
    env.DB.prepare("SELECT * FROM evaluations WHERE id = ?")
      .bind(id)
      .first<EvaluationRow>(),
    evaluationItems(env, id),
  ]);

  return json(
    request,
    env,
    formatEvaluation({
      ...row!,
      evaluator_name: user.name,
      items,
    }),
    201,
  );
}

export async function deleteEvaluation(
  request: Request,
  env: Env,
  user: AuthUser,
  evaluationId: string,
) {
  const evaluation = await env.DB.prepare(
    "SELECT * FROM evaluations WHERE id = ?",
  )
    .bind(evaluationId)
    .first<EvaluationRow>();

  if (!evaluation) {
    return json(request, env, { error: "Avaliação não encontrada." }, 404);
  }
  if (!canDeleteEvaluation(user, evaluation)) {
    return json(
      request,
      env,
      { error: "Você só pode excluir avaliações realizadas por você." },
      403,
    );
  }

  await env.DB.prepare("DELETE FROM evaluations WHERE id = ?")
    .bind(evaluationId)
    .run();
  return empty(request, env);
}
