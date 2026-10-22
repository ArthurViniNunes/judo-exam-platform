import type {
  AuthUser,
  EvaluationCategoryRow,
  EvaluationItemPartRow,
  EvaluationItemRow,
  EvaluationRow,
  PracticalCandidateRow,
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
    `SELECT evaluations.*, users.name AS evaluator_name,
            users.evaluator_rank AS evaluator_rank
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
  const categoryStatement = env.DB.prepare(
    `SELECT evaluation_categories.*
     FROM evaluation_categories
     INNER JOIN evaluations
       ON evaluations.id = evaluation_categories.evaluation_id
     ${where}
     ORDER BY evaluation_categories.position`,
  );
  const partStatement = env.DB.prepare(
    `SELECT evaluation_item_parts.*
     FROM evaluation_item_parts
     INNER JOIN evaluation_items
       ON evaluation_items.id = evaluation_item_parts.evaluation_item_id
     INNER JOIN evaluations
       ON evaluations.id = evaluation_items.evaluation_id
     ${where}
     ORDER BY evaluation_item_parts.position`,
  );
  const [result, itemResult, categoryResult, partResult] = filterId
    ? await Promise.all([
        statement.bind(filterId).all<EvaluationRow>(),
        itemStatement.bind(filterId).all<EvaluationItemRow>(),
        categoryStatement.bind(filterId).all<EvaluationCategoryRow>(),
        partStatement.bind(filterId).all<EvaluationItemPartRow>(),
      ])
    : await Promise.all([
        statement.all<EvaluationRow>(),
        itemStatement.all<EvaluationItemRow>(),
        categoryStatement.all<EvaluationCategoryRow>(),
        partStatement.all<EvaluationItemPartRow>(),
      ]);
  const partsByItem = new Map<string, EvaluationItemPartRow[]>();
  for (const part of partResult.results) {
    const parts = partsByItem.get(part.evaluation_item_id) ?? [];
    parts.push(part);
    partsByItem.set(part.evaluation_item_id, parts);
  }
  const itemsByEvaluation = new Map<string, EvaluationItemRow[]>();
  for (const item of itemResult.results) {
    const items = itemsByEvaluation.get(item.evaluation_id) ?? [];
    items.push({ ...item, parts: partsByItem.get(item.id) ?? [] });
    itemsByEvaluation.set(item.evaluation_id, items);
  }
  const categoriesByEvaluation = new Map<string, EvaluationCategoryRow[]>();
  for (const category of categoryResult.results) {
    const categories = categoriesByEvaluation.get(category.evaluation_id) ?? [];
    categories.push(category);
    categoriesByEvaluation.set(category.evaluation_id, categories);
  }
  return result.results.map((row) => ({
    ...row,
    categories: categoriesByEvaluation.get(row.id) ?? [],
    items: itemsByEvaluation.get(row.id) ?? [],
  }));
}

async function evaluationItems(env: Env, evaluationId: string) {
  const [itemResult, partResult] = await Promise.all([
    env.DB.prepare(
      "SELECT * FROM evaluation_items WHERE evaluation_id = ? ORDER BY position",
    )
      .bind(evaluationId)
      .all<EvaluationItemRow>(),
    env.DB.prepare(
      `SELECT evaluation_item_parts.* FROM evaluation_item_parts
       INNER JOIN evaluation_items
         ON evaluation_items.id = evaluation_item_parts.evaluation_item_id
       WHERE evaluation_items.evaluation_id = ?
       ORDER BY evaluation_item_parts.position`,
    )
      .bind(evaluationId)
      .all<EvaluationItemPartRow>(),
  ]);
  const partsByItem = new Map<string, EvaluationItemPartRow[]>();
  for (const part of partResult.results) {
    const parts = partsByItem.get(part.evaluation_item_id) ?? [];
    parts.push(part);
    partsByItem.set(part.evaluation_item_id, parts);
  }
  return itemResult.results.map((item) => ({
    ...item,
    parts: partsByItem.get(item.id) ?? [],
  }));
}

async function evaluationCategories(env: Env, evaluationId: string) {
  const result = await env.DB.prepare(
    "SELECT * FROM evaluation_categories WHERE evaluation_id = ? ORDER BY position",
  )
    .bind(evaluationId)
    .all<EvaluationCategoryRow>();
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

export async function listPracticalCandidates(request: Request, env: Env) {
  const result = await env.DB.prepare(
    `SELECT students.id, students.name,
            eligibilities.id AS eligibility_id,
            eligibilities.belt_id,
            eligibilities.belt_name,
            eligibilities.valid_from,
            eligibilities.source_attempt_id
       FROM students
       LEFT JOIN student_eligibilities AS eligibilities
         ON eligibilities.student_id = students.id
        AND eligibilities.revoked_at IS NULL
        AND (eligibilities.valid_until IS NULL OR eligibilities.valid_until > CURRENT_TIMESTAMP)
      ORDER BY CASE WHEN eligibilities.id IS NULL THEN 1 ELSE 0 END,
               students.name`,
  ).all<PracticalCandidateRow>();

  return json(
    request,
    env,
    result.results.map((candidate) => ({
      id: candidate.id,
      name: candidate.name,
      eligibility: candidate.eligibility_id
        ? {
            id: candidate.eligibility_id,
            beltId: candidate.belt_id,
            beltName: candidate.belt_name,
            validFrom: candidate.valid_from,
            source: "theory_attempt" as const,
            sourceAttemptId: candidate.source_attempt_id,
          }
        : null,
    })),
  );
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
  source: "direct" | "sync" = "direct",
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
    "SELECT * FROM evaluations WHERE id = ?",
  )
    .bind(id)
    .first<EvaluationRow>();
  if (duplicate) {
    if (duplicate.evaluator_id !== user.id) {
      return json(
        request,
        env,
        { error: "Este identificador de avaliação já está em uso." },
        409,
      );
    }
    const [items, categories] = await Promise.all([
      evaluationItems(env, duplicate.id),
      evaluationCategories(env, duplicate.id),
    ]);
    return json(
      request,
      env,
      formatEvaluation({ ...duplicate, categories, items }),
    );
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

  const eligibility = body.type === "técnica"
    ? await env.DB.prepare(
        `SELECT id, belt_id, belt_name, source_attempt_id, valid_from
           FROM student_eligibilities
          WHERE student_id = ?
            AND revoked_at IS NULL
            AND (valid_until IS NULL OR valid_until > CURRENT_TIMESTAMP)
          ORDER BY valid_from DESC
          LIMIT 1`,
      ).bind(student.id).first<{
        id: string;
        belt_id: string;
        belt_name: string;
        source_attempt_id: string;
        valid_from: string;
      }>()
    : null;

  if (body.type === "técnica" && !eligibility) {
    await env.DB.prepare(
      "INSERT INTO audit_events (id, actor_user_id, action, entity_type, entity_id, request_id, metadata_json) VALUES (?, ?, 'evaluation.rejected_missing_eligibility', 'student', ?, ?, ?)",
    ).bind(
      crypto.randomUUID(),
      user.id,
      student.id,
      request.headers.get("X-Request-Id") || crypto.randomUUID(),
      JSON.stringify({ source, evaluationId: id }),
    ).run();
    return json(
      request,
      env,
      { error: "Este judoca ainda não possui aprovação teórica para iniciar a avaliação prática." },
      409,
    );
  }

  if (eligibility && body.beltId && body.beltId !== eligibility.belt_id) {
    return json(
      request,
      env,
      { error: "A graduação da avaliação não corresponde à aprovação teórica do judoca." },
      409,
    );
  }

  const evaluationBelt = eligibility?.belt_name ?? body.belt.trim();

  const itemStatements = (body.items ?? []).flatMap((item, position) => {
    const itemId = crypto.randomUUID();
    return [
      env.DB.prepare(
        "INSERT INTO evaluation_items (id, evaluation_id, category, name, score, detail, position) VALUES (?, ?, ?, ?, ?, ?, ?)",
      ).bind(
        itemId,
        id,
        item.category.trim(),
        item.name.trim(),
        Math.round(item.score * 10) / 10,
        item.detail?.trim() || null,
        position,
      ),
      ...(item.parts ?? []).map((part, partPosition) =>
        env.DB.prepare(
          "INSERT INTO evaluation_item_parts (id, evaluation_item_id, name, score, position) VALUES (?, ?, ?, ?, ?)",
        ).bind(
          crypto.randomUUID(),
          itemId,
          part.name.trim(),
          Math.round(part.score * 10) / 10,
          partPosition,
        ),
      ),
    ];
  });
  const statements = [
    env.DB.prepare(
      "INSERT OR IGNORE INTO student_evaluators (student_id, evaluator_id) VALUES (?, ?)",
    ).bind(student.id, user.id),
    env.DB.prepare(
      "INSERT INTO evaluations (id, athlete, student_id, evaluator_id, professor, belt, type, score, result, matrix_id, eligibility_id, detail) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ).bind(
      id,
      student.name,
      student.id,
      user.id,
      user.name,
      evaluationBelt,
      body.type,
      Math.round(body.score),
      body.result?.trim() || null,
      body.matrixId || null,
      eligibility?.id ?? null,
      body.detail?.trim() || null,
    ),
    ...(body.categories ?? []).map((category, position) =>
      env.DB.prepare(
        "INSERT INTO evaluation_categories (id, evaluation_id, name, score, position) VALUES (?, ?, ?, ?, ?)",
      ).bind(
        crypto.randomUUID(),
        id,
        category.name.trim(),
        Math.round(category.score * 10) / 10,
        position,
      ),
    ),
    ...itemStatements,
    env.DB.prepare(
      "INSERT INTO audit_events (id, actor_user_id, action, entity_type, entity_id, request_id, metadata_json) VALUES (?, ?, ?, 'evaluation', ?, ?, ?)",
    ).bind(
      crypto.randomUUID(),
      user.id,
      source === "sync" ? "evaluation.synced" : "evaluation.created",
      id,
      request.headers.get("X-Request-Id") || crypto.randomUUID(),
      JSON.stringify({
        source,
        studentId: student.id,
        type: body.type,
        categoryCount: body.categories?.length ?? 0,
        itemCount: body.items?.length ?? 0,
        eligibilityId: eligibility?.id ?? null,
        eligibilitySourceAttemptId: eligibility?.source_attempt_id ?? null,
      }),
    ),
  ];
  await env.DB.batch(statements);
  const [row, categories, items] = await Promise.all([
    env.DB.prepare("SELECT * FROM evaluations WHERE id = ?")
      .bind(id)
      .first<EvaluationRow>(),
    evaluationCategories(env, id),
    evaluationItems(env, id),
  ]);

  return json(
    request,
    env,
    formatEvaluation({
      ...row!,
      evaluator_name: user.name,
      categories,
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
