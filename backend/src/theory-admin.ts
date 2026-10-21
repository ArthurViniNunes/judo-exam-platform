import type { AuthUser } from "./contracts";
import { empty, json } from "./http";
import {
  validateTheoryPublication,
  validateTheoryQuestionInput,
  validateTheoryVersionInput,
} from "./theory-domain";
import type {
  TheoryExamStatus,
  TheoryExamVersion,
  TheoryExamVersionSummary,
  TheoryMediaKind,
  TheoryQuestion,
  TheoryQuestionMedia,
  TheoryQuestionOption,
  TheoryQuestionOrder,
} from "../../lib/theory-exams";

type VersionRow = {
  id: string;
  belt_id: TheoryExamVersionSummary["beltId"];
  belt_name: string;
  version_number: number;
  minimum_score: number | null;
  question_order: TheoryQuestionOrder | null;
  status: TheoryExamStatus;
  question_count: number;
  total_points: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  closed_at: string | null;
};

type QuestionRow = {
  id: string;
  category: string;
  prompt: string;
  points: number;
  explanation: string;
  position: number;
};

type OptionRow = {
  id: string;
  question_id: string;
  text: string;
  is_correct: number;
  position: number;
};

type MediaRow = {
  id: string;
  question_id: string;
  kind: TheoryMediaKind;
  source_url: string;
  alt_text: string;
  metadata_sensitive: number;
};

const versionSummaryQuery = `
  SELECT versions.id, versions.belt_id, versions.belt_name,
         versions.version_number, versions.minimum_score,
         versions.question_order, versions.status,
         versions.created_at, versions.updated_at,
         versions.published_at, versions.closed_at,
         COUNT(questions.id) AS question_count,
         COALESCE(SUM(questions.points), 0) AS total_points
    FROM theory_exam_versions AS versions
    LEFT JOIN theory_questions AS questions
      ON questions.version_id = versions.id`;

function formatVersion(row: VersionRow): TheoryExamVersionSummary {
  return {
    id: row.id,
    beltId: row.belt_id,
    beltName: row.belt_name,
    versionNumber: row.version_number,
    minimumScore: row.minimum_score,
    questionOrder: row.question_order,
    status: row.status,
    questionCount: Number(row.question_count),
    totalPoints: Number(row.total_points),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
    closedAt: row.closed_at,
  };
}

function auditStatement(
  request: Request,
  env: Env,
  user: AuthUser,
  action: string,
  entityType: string,
  entityId: string,
  metadata: Record<string, unknown> = {},
) {
  return env.DB.prepare(
    "INSERT INTO audit_events (id, actor_user_id, action, entity_type, entity_id, request_id, metadata_json) VALUES (?, ?, ?, ?, ?, ?, ?)",
  ).bind(
    crypto.randomUUID(),
    user.id,
    action,
    entityType,
    entityId,
    request.headers.get("X-Request-Id") || "unidentified",
    JSON.stringify(metadata),
  );
}

async function versionSummary(env: Env, versionId: string) {
  const row = await env.DB.prepare(
    `${versionSummaryQuery}
      WHERE versions.id = ?
      GROUP BY versions.id`,
  )
    .bind(versionId)
    .first<VersionRow>();
  return row ? formatVersion(row) : null;
}

async function requireDraft(
  request: Request,
  env: Env,
  versionId: string,
) {
  const version = await env.DB.prepare(
    "SELECT id, status FROM theory_exam_versions WHERE id = ?",
  )
    .bind(versionId)
    .first<{ id: string; status: TheoryExamStatus }>();
  if (!version) {
    return { response: json(request, env, { error: "Versão de prova não encontrada." }, 404) };
  }
  if (version.status !== "draft") {
    return {
      response: json(
        request,
        env,
        { error: "Uma versão publicada ou encerrada não pode ser alterada." },
        409,
      ),
    };
  }
  return { version };
}

export async function listTheoryVersions(request: Request, env: Env) {
  const result = await env.DB.prepare(
    `${versionSummaryQuery}
      GROUP BY versions.id
      ORDER BY
        CASE versions.status WHEN 'published' THEN 0 WHEN 'draft' THEN 1 ELSE 2 END,
        versions.belt_id,
        versions.version_number DESC`,
  ).all<VersionRow>();
  return json(request, env, result.results.map(formatVersion));
}

export async function getTheoryVersion(
  request: Request,
  env: Env,
  versionId: string,
) {
  const version = await versionSummary(env, versionId);
  if (!version) {
    return json(request, env, { error: "Versão de prova não encontrada." }, 404);
  }

  const [questionsResult, optionsResult, mediaResult] = await Promise.all([
    env.DB.prepare(
      "SELECT id, category, prompt, points, explanation, position FROM theory_questions WHERE version_id = ? ORDER BY position",
    ).bind(versionId).all<QuestionRow>(),
    env.DB.prepare(
      `SELECT options.id, options.question_id, options.text,
              options.is_correct, options.position
         FROM theory_question_options AS options
         JOIN theory_questions AS questions ON questions.id = options.question_id
        WHERE questions.version_id = ?
        ORDER BY questions.position, options.position`,
    ).bind(versionId).all<OptionRow>(),
    env.DB.prepare(
      `SELECT media.id, media.question_id, media.kind, media.source_url,
              media.alt_text, media.metadata_sensitive
         FROM theory_question_media AS media
         JOIN theory_questions AS questions ON questions.id = media.question_id
        WHERE questions.version_id = ?`,
    ).bind(versionId).all<MediaRow>(),
  ]);

  const optionsByQuestion = new Map<string, TheoryQuestionOption[]>();
  optionsResult.results.forEach((row) => {
    const options = optionsByQuestion.get(row.question_id) ?? [];
    options.push({
      id: row.id,
      text: row.text,
      isCorrect: row.is_correct === 1,
      position: row.position,
    });
    optionsByQuestion.set(row.question_id, options);
  });
  const mediaByQuestion = new Map<string, TheoryQuestionMedia>();
  mediaResult.results.forEach((row) => {
    mediaByQuestion.set(row.question_id, {
      id: row.id,
      kind: row.kind,
      sourceUrl: row.source_url,
      altText: row.alt_text,
      metadataSensitive: row.metadata_sensitive === 1,
    });
  });
  const questions: TheoryQuestion[] = questionsResult.results.map((row) => ({
    id: row.id,
    category: row.category,
    prompt: row.prompt,
    points: row.points,
    explanation: row.explanation,
    position: row.position,
    options: optionsByQuestion.get(row.id) ?? [],
    media: mediaByQuestion.get(row.id) ?? null,
  }));
  const result: TheoryExamVersion = { ...version, questions };
  return json(request, env, result);
}

export async function createTheoryVersion(
  request: Request,
  env: Env,
  user: AuthUser,
) {
  const input = validateTheoryVersionInput(await request.json<unknown>());
  if (typeof input === "string") return json(request, env, { error: input }, 400);

  const versionId = crypto.randomUUID();
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO theory_exam_versions (
         id, belt_id, belt_name, version_number, minimum_score,
         question_order, status, created_by
       )
       SELECT ?, ?, ?, COALESCE(MAX(version_number), 0) + 1, ?, ?, 'draft', ?
         FROM theory_exam_versions
        WHERE belt_id = ?`,
    ).bind(
      versionId,
      input.beltId,
      input.beltName,
      input.minimumScore,
      input.questionOrder,
      user.id,
      input.beltId,
    ),
    auditStatement(request, env, user, "theory_version.created", "theory_exam_version", versionId, {
      beltId: input.beltId,
    }),
  ]);
  const version = await versionSummary(env, versionId);
  return json(request, env, version, 201);
}

export async function updateTheoryVersion(
  request: Request,
  env: Env,
  user: AuthUser,
  versionId: string,
) {
  const draft = await requireDraft(request, env, versionId);
  if (draft.response) return draft.response;
  const current = await versionSummary(env, versionId);
  if (!current) return json(request, env, { error: "Versão de prova não encontrada." }, 404);
  const body = await request.json<Record<string, unknown>>();
  const input = validateTheoryVersionInput({
    beltId: current.beltId,
    minimumScore: body.minimumScore,
    questionOrder: body.questionOrder,
  });
  if (typeof input === "string") return json(request, env, { error: input }, 400);

  await env.DB.batch([
    env.DB.prepare(
      "UPDATE theory_exam_versions SET minimum_score = ?, question_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'draft'",
    ).bind(input.minimumScore, input.questionOrder, versionId),
    auditStatement(request, env, user, "theory_version.updated", "theory_exam_version", versionId),
  ]);
  return getTheoryVersion(request, env, versionId);
}

export async function deleteTheoryVersion(
  request: Request,
  env: Env,
  user: AuthUser,
  versionId: string,
) {
  const draft = await requireDraft(request, env, versionId);
  if (draft.response) return draft.response;
  await env.DB.batch([
    env.DB.prepare("DELETE FROM theory_exam_versions WHERE id = ? AND status = 'draft'").bind(versionId),
    auditStatement(request, env, user, "theory_version.deleted", "theory_exam_version", versionId),
  ]);
  return empty(request, env);
}

async function saveQuestionStatements(
  env: Env,
  questionId: string,
  input: Exclude<ReturnType<typeof validateTheoryQuestionInput>, string>,
) {
  const statements: D1PreparedStatement[] = input.options.map((option, position) =>
    env.DB.prepare(
      "INSERT INTO theory_question_options (id, question_id, text, is_correct, position) VALUES (?, ?, ?, ?, ?)",
    ).bind(crypto.randomUUID(), questionId, option.text, option.isCorrect ? 1 : 0, position),
  );
  if (input.media) {
    statements.push(
      env.DB.prepare(
        "INSERT INTO theory_question_media (id, question_id, kind, source_url, alt_text, metadata_sensitive) VALUES (?, ?, ?, ?, ?, ?)",
      ).bind(
        crypto.randomUUID(),
        questionId,
        input.media.kind,
        input.media.sourceUrl,
        input.media.altText,
        input.media.metadataSensitive ? 1 : 0,
      ),
    );
  }
  return statements;
}

export async function createTheoryQuestion(
  request: Request,
  env: Env,
  user: AuthUser,
  versionId: string,
) {
  const draft = await requireDraft(request, env, versionId);
  if (draft.response) return draft.response;
  const input = validateTheoryQuestionInput(await request.json<unknown>());
  if (typeof input === "string") return json(request, env, { error: input }, 400);
  const questionId = crypto.randomUUID();
  const positionRow = await env.DB.prepare(
    "SELECT COALESCE(MAX(position), -1) + 1 AS position FROM theory_questions WHERE version_id = ?",
  ).bind(versionId).first<{ position: number }>();
  const statements: D1PreparedStatement[] = [
    env.DB.prepare(
      "INSERT INTO theory_questions (id, version_id, category, prompt, points, explanation, position) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ).bind(
      questionId,
      versionId,
      input.category,
      input.prompt,
      input.points,
      input.explanation,
      positionRow?.position ?? 0,
    ),
    ...(await saveQuestionStatements(env, questionId, input)),
    auditStatement(request, env, user, "theory_question.created", "theory_question", questionId, {
      versionId,
    }),
    env.DB.prepare(
      "UPDATE theory_exam_versions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    ).bind(versionId),
  ];
  await env.DB.batch(statements);
  return getTheoryVersion(request, env, versionId);
}

export async function updateTheoryQuestion(
  request: Request,
  env: Env,
  user: AuthUser,
  questionId: string,
) {
  const question = await env.DB.prepare(
    "SELECT id, version_id FROM theory_questions WHERE id = ?",
  ).bind(questionId).first<{ id: string; version_id: string }>();
  if (!question) return json(request, env, { error: "Questão não encontrada." }, 404);
  const draft = await requireDraft(request, env, question.version_id);
  if (draft.response) return draft.response;
  const input = validateTheoryQuestionInput(await request.json<unknown>());
  if (typeof input === "string") return json(request, env, { error: input }, 400);

  await env.DB.batch([
    env.DB.prepare(
      "UPDATE theory_questions SET category = ?, prompt = ?, points = ?, explanation = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    ).bind(input.category, input.prompt, input.points, input.explanation, questionId),
    env.DB.prepare("DELETE FROM theory_question_options WHERE question_id = ?").bind(questionId),
    env.DB.prepare("DELETE FROM theory_question_media WHERE question_id = ?").bind(questionId),
    ...(await saveQuestionStatements(env, questionId, input)),
    auditStatement(request, env, user, "theory_question.updated", "theory_question", questionId, {
      versionId: question.version_id,
    }),
    env.DB.prepare(
      "UPDATE theory_exam_versions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    ).bind(question.version_id),
  ]);
  return getTheoryVersion(request, env, question.version_id);
}

export async function deleteTheoryQuestion(
  request: Request,
  env: Env,
  user: AuthUser,
  questionId: string,
) {
  const question = await env.DB.prepare(
    "SELECT id, version_id FROM theory_questions WHERE id = ?",
  ).bind(questionId).first<{ id: string; version_id: string }>();
  if (!question) return json(request, env, { error: "Questão não encontrada." }, 404);
  const draft = await requireDraft(request, env, question.version_id);
  if (draft.response) return draft.response;
  await env.DB.batch([
    env.DB.prepare("DELETE FROM theory_questions WHERE id = ?").bind(questionId),
    auditStatement(request, env, user, "theory_question.deleted", "theory_question", questionId, {
      versionId: question.version_id,
    }),
    env.DB.prepare(
      "UPDATE theory_exam_versions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    ).bind(question.version_id),
  ]);
  return empty(request, env);
}

export async function publishTheoryVersion(
  request: Request,
  env: Env,
  user: AuthUser,
  versionId: string,
) {
  const draft = await requireDraft(request, env, versionId);
  if (draft.response) return draft.response;
  const version = await versionSummary(env, versionId);
  if (!version) return json(request, env, { error: "Versão de prova não encontrada." }, 404);
  const questions = await env.DB.prepare(
    `SELECT questions.explanation,
            COUNT(options.id) AS option_count,
            COALESCE(SUM(CASE WHEN options.is_correct = 1 THEN 1 ELSE 0 END), 0) AS correct_option_count,
            media.kind AS media_kind,
            COALESCE(media.metadata_sensitive, 0) AS metadata_sensitive
       FROM theory_questions AS questions
       LEFT JOIN theory_question_options AS options ON options.question_id = questions.id
       LEFT JOIN theory_question_media AS media ON media.question_id = questions.id
      WHERE questions.version_id = ?
      GROUP BY questions.id
      ORDER BY questions.position`,
  ).bind(versionId).all<{
    explanation: string;
    option_count: number;
    correct_option_count: number;
    media_kind: TheoryMediaKind | null;
    metadata_sensitive: number;
  }>();
  const errors = validateTheoryPublication(
    { minimumScore: version.minimumScore, questionOrder: version.questionOrder },
    questions.results.map((question) => ({
      explanation: question.explanation,
      optionCount: Number(question.option_count),
      correctOptionCount: Number(question.correct_option_count),
      mediaKind: question.media_kind,
      metadataSensitive: question.metadata_sensitive === 1,
    })),
  );
  if (errors.length) {
    return json(request, env, { error: "A versão ainda não pode ser publicada.", details: errors }, 409);
  }
  const active = await env.DB.prepare(
    "SELECT id FROM theory_exam_versions WHERE belt_id = ? AND status = 'published' AND id <> ?",
  ).bind(version.beltId, versionId).first<{ id: string }>();
  if (active) {
    return json(
      request,
      env,
      { error: "Encerre a versão atualmente publicada desta graduação antes de publicar outra." },
      409,
    );
  }

  await env.DB.batch([
    env.DB.prepare(
      "UPDATE theory_exam_versions SET status = 'published', published_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'draft'",
    ).bind(versionId),
    auditStatement(request, env, user, "theory_version.published", "theory_exam_version", versionId, {
      beltId: version.beltId,
      versionNumber: version.versionNumber,
    }),
  ]);
  return getTheoryVersion(request, env, versionId);
}

export async function closeTheoryVersion(
  request: Request,
  env: Env,
  user: AuthUser,
  versionId: string,
) {
  const version = await versionSummary(env, versionId);
  if (!version) return json(request, env, { error: "Versão de prova não encontrada." }, 404);
  if (version.status !== "published") {
    return json(request, env, { error: "Somente uma versão publicada pode ser encerrada." }, 409);
  }
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE theory_exam_versions SET status = 'closed', closed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'published'",
    ).bind(versionId),
    auditStatement(request, env, user, "theory_version.closed", "theory_exam_version", versionId),
  ]);
  return getTheoryVersion(request, env, versionId);
}
