import type { AuthUser } from "./contracts";
import { json } from "./http";
import {
  scoreTheoryAttempt,
  shuffleTheoryItems,
} from "./theory-attempt-domain";
import type {
  StudentTheoryAttempt,
  StudentTheoryAttemptQuestion,
  StudentTheoryResult,
  TheoryMediaKind,
} from "../../lib/theory-exams";

type AttemptRow = {
  id: string;
  student_id: string;
  version_id: string;
  status: "in_progress" | "submitted";
  score: number | null;
  passed: number | null;
  started_at: string;
  updated_at: string;
  submitted_at: string | null;
  belt_id: string;
  belt_name: string;
  minimum_score: number;
};

type AttemptQuestionRow = {
  id: string;
  source_question_id: string;
  category: string;
  prompt: string;
  points: number;
  explanation: string;
  options_json: string;
  correct_option_id: string;
  media_json: string | null;
  position: number;
  selected_option_id: string | null;
  awarded_points: number | null;
};

type SourceQuestionRow = {
  id: string;
  category: string;
  prompt: string;
  points: number;
  explanation: string;
  position: number;
};

type SourceOptionRow = {
  id: string;
  question_id: string;
  text: string;
  is_correct: number;
  position: number;
};

type SourceMediaRow = {
  id: string;
  question_id: string;
  kind: TheoryMediaKind;
  source_url: string;
  alt_text: string;
};

type SafeOption = { id: string; text: string };
type SafeMedia = {
  kind: TheoryMediaKind;
  sourceUrl: string;
  altText: string;
};

function parseOptions(value: string): SafeOption[] {
  const parsed = JSON.parse(value) as unknown;
  return Array.isArray(parsed)
    ? parsed.filter(
        (option): option is SafeOption =>
          Boolean(
            option &&
            typeof option === "object" &&
            typeof (option as SafeOption).id === "string" &&
            typeof (option as SafeOption).text === "string",
          ),
      )
    : [];
}

function parseMedia(value: string | null): SafeMedia | null {
  if (!value) return null;
  const parsed = JSON.parse(value) as SafeMedia;
  return parsed && typeof parsed.sourceUrl === "string" ? parsed : null;
}

function auditStatement(
  request: Request,
  env: Env,
  user: AuthUser,
  action: string,
  entityId: string,
  metadata: Record<string, unknown> = {},
) {
  return env.DB.prepare(
    "INSERT INTO audit_events (id, actor_user_id, action, entity_type, entity_id, request_id, metadata_json) VALUES (?, ?, ?, 'theory_attempt', ?, ?, ?)",
  ).bind(
    crypto.randomUUID(),
    user.id,
    action,
    entityId,
    request.headers.get("X-Request-Id") || "unidentified",
    JSON.stringify(metadata),
  );
}

async function attemptById(env: Env, attemptId: string, studentId: string) {
  return env.DB.prepare(
    `SELECT attempts.id, attempts.student_id, attempts.version_id,
            attempts.status, attempts.score, attempts.passed,
            attempts.started_at, attempts.updated_at, attempts.submitted_at,
            versions.belt_id, versions.belt_name, versions.minimum_score
       FROM theory_attempts AS attempts
       JOIN theory_exam_versions AS versions ON versions.id = attempts.version_id
      WHERE attempts.id = ? AND attempts.student_id = ?`,
  )
    .bind(attemptId, studentId)
    .first<AttemptRow>();
}

async function attemptQuestions(env: Env, attemptId: string) {
  const result = await env.DB.prepare(
    `SELECT questions.id, questions.source_question_id, questions.category,
            questions.prompt, questions.points, questions.explanation,
            questions.options_json, questions.correct_option_id,
            questions.media_json, questions.position,
            answers.selected_option_id, answers.awarded_points
       FROM theory_attempt_questions AS questions
       LEFT JOIN theory_answers AS answers
         ON answers.attempt_question_id = questions.id
      WHERE questions.attempt_id = ?
      ORDER BY questions.position`,
  )
    .bind(attemptId)
    .all<AttemptQuestionRow>();
  return result.results;
}

function safeQuestion(row: AttemptQuestionRow): StudentTheoryAttemptQuestion {
  return {
    id: row.id,
    category: row.category,
    prompt: row.prompt,
    points: row.points,
    position: row.position,
    options: parseOptions(row.options_json),
    media: parseMedia(row.media_json),
    selectedOptionId: row.selected_option_id,
  };
}

async function formatAttempt(env: Env, attempt: AttemptRow): Promise<StudentTheoryAttempt> {
  const rows = await attemptQuestions(env, attempt.id);
  return {
    id: attempt.id,
    status: attempt.status,
    beltId: attempt.belt_id,
    beltName: attempt.belt_name,
    minimumScore: attempt.minimum_score,
    startedAt: attempt.started_at,
    updatedAt: attempt.updated_at,
    questions: rows.map(safeQuestion),
    answeredCount: rows.filter((row) => row.selected_option_id).length,
  };
}

async function studentRecord(request: Request, env: Env, user: AuthUser) {
  if (!user.student_id) {
    return {
      response: json(request, env, { error: "Cadastro de aluno não vinculado." }, 409),
    };
  }
  const student = await env.DB.prepare(
    "SELECT id, target_belt_id, target_belt_name FROM students WHERE id = ? AND user_id = ?",
  )
    .bind(user.student_id, user.id)
    .first<{
      id: string;
      target_belt_id: string | null;
      target_belt_name: string | null;
    }>();
  if (!student) {
    return {
      response: json(request, env, { error: "Cadastro de aluno não encontrado." }, 404),
    };
  }
  return { student };
}

export async function getAvailableTheoryExam(
  request: Request,
  env: Env,
  user: AuthUser,
) {
  const lookup = await studentRecord(request, env, user);
  if (lookup.response) return lookup.response;
  const student = lookup.student;
  if (!student.target_belt_id) {
    return json(request, env, { status: "needs_target_belt" });
  }

  const eligibility = await env.DB.prepare(
    "SELECT belt_id, belt_name, valid_from FROM student_eligibilities WHERE student_id = ? AND revoked_at IS NULL AND (valid_until IS NULL OR valid_until > CURRENT_TIMESTAMP) ORDER BY valid_from DESC LIMIT 1",
  )
    .bind(student.id)
    .first<{ belt_id: string; belt_name: string; valid_from: string }>();
  if (eligibility) {
    return json(request, env, {
      status: "eligible",
      beltId: eligibility.belt_id,
      beltName: eligibility.belt_name,
      validFrom: eligibility.valid_from,
    });
  }

  const active = await env.DB.prepare(
    "SELECT id FROM theory_attempts WHERE student_id = ? AND status = 'in_progress' LIMIT 1",
  )
    .bind(student.id)
    .first<{ id: string }>();
  if (active) {
    const attempt = await attemptById(env, active.id, student.id);
    return json(request, env, {
      status: "in_progress",
      attempt: attempt ? await formatAttempt(env, attempt) : null,
    });
  }

  const version = await env.DB.prepare(
    `SELECT versions.id, versions.belt_id, versions.belt_name,
            versions.version_number, versions.minimum_score,
            COUNT(questions.id) AS question_count,
            COALESCE(SUM(questions.points), 0) AS total_points
       FROM theory_exam_versions AS versions
       JOIN theory_questions AS questions ON questions.version_id = versions.id
      WHERE versions.belt_id = ? AND versions.status = 'published'
      GROUP BY versions.id
      LIMIT 1`,
  )
    .bind(student.target_belt_id)
    .first<{
      id: string;
      belt_id: string;
      belt_name: string;
      version_number: number;
      minimum_score: number;
      question_count: number;
      total_points: number;
    }>();
  if (!version) {
    return json(request, env, {
      status: "unavailable",
      beltId: student.target_belt_id,
      beltName: student.target_belt_name,
    });
  }
  return json(request, env, {
    status: "available",
    exam: {
      beltId: version.belt_id,
      beltName: version.belt_name,
      versionNumber: version.version_number,
      minimumScore: version.minimum_score,
      questionCount: Number(version.question_count),
      totalPoints: Number(version.total_points),
    },
  });
}

export async function getCurrentTheoryAttempt(
  request: Request,
  env: Env,
  user: AuthUser,
) {
  const lookup = await studentRecord(request, env, user);
  if (lookup.response) return lookup.response;
  const active = await env.DB.prepare(
    "SELECT id FROM theory_attempts WHERE student_id = ? AND status = 'in_progress' LIMIT 1",
  )
    .bind(lookup.student.id)
    .first<{ id: string }>();
  if (!active) return json(request, env, { attempt: null });
  const attempt = await attemptById(env, active.id, lookup.student.id);
  return json(request, env, {
    attempt: attempt ? await formatAttempt(env, attempt) : null,
  });
}

export async function startTheoryAttempt(
  request: Request,
  env: Env,
  user: AuthUser,
) {
  const lookup = await studentRecord(request, env, user);
  if (lookup.response) return lookup.response;
  const student = lookup.student;
  if (!student.target_belt_id) {
    return json(request, env, { error: "Confirme sua graduação antes de iniciar." }, 409);
  }

  const existing = await env.DB.prepare(
    "SELECT id FROM theory_attempts WHERE student_id = ? AND status = 'in_progress' LIMIT 1",
  )
    .bind(student.id)
    .first<{ id: string }>();
  if (existing) {
    const attempt = await attemptById(env, existing.id, student.id);
    return json(request, env, attempt ? await formatAttempt(env, attempt) : null);
  }

  const eligibility = await env.DB.prepare(
    "SELECT id FROM student_eligibilities WHERE student_id = ? AND revoked_at IS NULL AND (valid_until IS NULL OR valid_until > CURRENT_TIMESTAMP) LIMIT 1",
  )
    .bind(student.id)
    .first<{ id: string }>();
  if (eligibility) {
    return json(request, env, { error: "Sua aprovação teórica já está registrada." }, 409);
  }

  const version = await env.DB.prepare(
    "SELECT id, minimum_score FROM theory_exam_versions WHERE belt_id = ? AND status = 'published' LIMIT 1",
  )
    .bind(student.target_belt_id)
    .first<{ id: string; minimum_score: number }>();
  if (!version) {
    return json(request, env, { error: "A prova desta graduação ainda não foi liberada." }, 409);
  }

  const [questionsResult, optionsResult, mediaResult] = await Promise.all([
    env.DB.prepare(
      "SELECT id, category, prompt, points, explanation, position FROM theory_questions WHERE version_id = ? ORDER BY position",
    ).bind(version.id).all<SourceQuestionRow>(),
    env.DB.prepare(
      `SELECT options.id, options.question_id, options.text,
              options.is_correct, options.position
         FROM theory_question_options AS options
         JOIN theory_questions AS questions ON questions.id = options.question_id
        WHERE questions.version_id = ?
        ORDER BY options.position`,
    ).bind(version.id).all<SourceOptionRow>(),
    env.DB.prepare(
      `SELECT media.id, media.question_id, media.kind,
              media.source_url, media.alt_text
         FROM theory_question_media AS media
         JOIN theory_questions AS questions ON questions.id = media.question_id
        WHERE questions.version_id = ?`,
    ).bind(version.id).all<SourceMediaRow>(),
  ]);
  if (!questionsResult.results.length) {
    return json(request, env, { error: "A prova publicada não possui questões." }, 409);
  }

  const optionsByQuestion = new Map<string, SourceOptionRow[]>();
  optionsResult.results.forEach((option) => {
    const options = optionsByQuestion.get(option.question_id) ?? [];
    options.push(option);
    optionsByQuestion.set(option.question_id, options);
  });
  const mediaByQuestion = new Map(
    mediaResult.results.map((media) => [media.question_id, media]),
  );
  const attemptId = crypto.randomUUID();
  const shuffledQuestions = shuffleTheoryItems(questionsResult.results);
  const statements: D1PreparedStatement[] = [
    env.DB.prepare(
      "INSERT INTO theory_attempts (id, student_id, version_id) VALUES (?, ?, ?)",
    ).bind(attemptId, student.id, version.id),
  ];

  shuffledQuestions.forEach((question, position) => {
    const options = shuffleTheoryItems(optionsByQuestion.get(question.id) ?? []);
    const correct = options.find((option) => option.is_correct === 1);
    if (!correct) throw new Error(`Question ${question.id} has no correct option`);
    const media = mediaByQuestion.get(question.id);
    statements.push(
      env.DB.prepare(
        `INSERT INTO theory_attempt_questions (
           id, attempt_id, source_question_id, category, prompt, points,
           explanation, options_json, correct_option_id, media_json, position
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        crypto.randomUUID(),
        attemptId,
        question.id,
        question.category,
        question.prompt,
        question.points,
        question.explanation,
        JSON.stringify(options.map((option) => ({ id: option.id, text: option.text }))),
        correct.id,
        media
          ? JSON.stringify({
              kind: media.kind,
              sourceUrl: media.source_url,
              altText: media.alt_text || "Mídia da questão",
            })
          : null,
        position,
      ),
    );
  });
  statements.push(
    auditStatement(request, env, user, "theory_attempt.started", attemptId, {
      versionId: version.id,
      beltId: student.target_belt_id,
    }),
  );

  try {
    await env.DB.batch(statements);
  } catch (error) {
    const concurrent = await env.DB.prepare(
      "SELECT id FROM theory_attempts WHERE student_id = ? AND status = 'in_progress' LIMIT 1",
    )
      .bind(student.id)
      .first<{ id: string }>();
    if (!concurrent) throw error;
    const attempt = await attemptById(env, concurrent.id, student.id);
    return json(request, env, attempt ? await formatAttempt(env, attempt) : null);
  }

  const attempt = await attemptById(env, attemptId, student.id);
  return json(request, env, attempt ? await formatAttempt(env, attempt) : null, 201);
}

export async function saveTheoryAnswer(
  request: Request,
  env: Env,
  user: AuthUser,
  attemptId: string,
) {
  const lookup = await studentRecord(request, env, user);
  if (lookup.response) return lookup.response;
  const attempt = await attemptById(env, attemptId, lookup.student.id);
  if (!attempt) return json(request, env, { error: "Tentativa não encontrada." }, 404);
  if (attempt.status !== "in_progress") {
    return json(request, env, { error: "Esta prova já foi entregue." }, 409);
  }
  const body = await request.json<{
    attemptQuestionId?: string;
    selectedOptionId?: string | null;
  }>();
  const question = await env.DB.prepare(
    "SELECT id, options_json FROM theory_attempt_questions WHERE id = ? AND attempt_id = ?",
  )
    .bind(body.attemptQuestionId || "", attemptId)
    .first<{ id: string; options_json: string }>();
  if (!question) return json(request, env, { error: "Questão não encontrada." }, 404);
  const selectedOptionId = body.selectedOptionId ?? null;
  if (
    selectedOptionId &&
    !parseOptions(question.options_json).some((option) => option.id === selectedOptionId)
  ) {
    return json(request, env, { error: "Selecione uma alternativa válida." }, 400);
  }

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO theory_answers (
         attempt_question_id, selected_option_id, awarded_points, answered_at
       ) VALUES (?, ?, NULL, CURRENT_TIMESTAMP)
       ON CONFLICT(attempt_question_id) DO UPDATE SET
         selected_option_id = excluded.selected_option_id,
         awarded_points = NULL,
         answered_at = CURRENT_TIMESTAMP`,
    ).bind(question.id, selectedOptionId),
    env.DB.prepare(
      "UPDATE theory_attempts SET updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'in_progress'",
    ).bind(attemptId),
  ]);
  const progress = await env.DB.prepare(
    `SELECT COUNT(questions.id) AS total,
            SUM(CASE WHEN answers.selected_option_id IS NOT NULL THEN 1 ELSE 0 END) AS answered
       FROM theory_attempt_questions AS questions
       LEFT JOIN theory_answers AS answers ON answers.attempt_question_id = questions.id
      WHERE questions.attempt_id = ?`,
  )
    .bind(attemptId)
    .first<{ total: number; answered: number }>();
  return json(request, env, {
    answeredCount: Number(progress?.answered ?? 0),
    questionCount: Number(progress?.total ?? 0),
  });
}

export async function submitTheoryAttempt(
  request: Request,
  env: Env,
  user: AuthUser,
  attemptId: string,
) {
  const lookup = await studentRecord(request, env, user);
  if (lookup.response) return lookup.response;
  const attempt = await attemptById(env, attemptId, lookup.student.id);
  if (!attempt) return json(request, env, { error: "Tentativa não encontrada." }, 404);
  if (attempt.status === "submitted") return getTheoryResult(request, env, user, attemptId);

  const rows = await attemptQuestions(env, attemptId);
  const unanswered = rows.filter((row) => !row.selected_option_id);
  if (unanswered.length) {
    return json(
      request,
      env,
      {
        error: "Responda todas as questões antes de entregar a prova.",
        details: unanswered.map((row) => `Questão ${row.position + 1} ainda não respondida.`),
      },
      409,
    );
  }
  const answers = new Map(
    rows.map((row) => [row.id, row.selected_option_id as string]),
  );
  const scored = scoreTheoryAttempt(
    rows.map((row) => ({
      id: row.id,
      points: row.points,
      correctOptionId: row.correct_option_id,
    })),
    answers,
    attempt.minimum_score,
  );
  const statements: D1PreparedStatement[] = rows.map((row) =>
    env.DB.prepare(
      "UPDATE theory_answers SET awarded_points = ? WHERE attempt_question_id = ?",
    ).bind(scored.awardedByQuestion[row.id], row.id),
  );
  statements.push(
    env.DB.prepare(
      "UPDATE theory_attempts SET status = 'submitted', score = ?, passed = ?, submitted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'in_progress'",
    ).bind(scored.score, scored.passed ? 1 : 0, attemptId),
  );
  if (scored.passed) {
    statements.push(
      env.DB.prepare(
        `INSERT OR IGNORE INTO student_eligibilities (
           id, student_id, belt_id, belt_name, source_attempt_id
         ) VALUES (?, ?, ?, ?, ?)`,
      ).bind(
        crypto.randomUUID(),
        lookup.student.id,
        attempt.belt_id,
        attempt.belt_name,
        attemptId,
      ),
    );
  }
  statements.push(
    auditStatement(request, env, user, "theory_attempt.submitted", attemptId, {
      score: scored.score,
      passed: scored.passed,
      beltId: attempt.belt_id,
    }),
  );
  await env.DB.batch(statements);
  return getTheoryResult(request, env, user, attemptId);
}

export async function getTheoryResult(
  request: Request,
  env: Env,
  user: AuthUser,
  attemptId: string,
) {
  const lookup = await studentRecord(request, env, user);
  if (lookup.response) return lookup.response;
  const attempt = await attemptById(env, attemptId, lookup.student.id);
  if (!attempt) return json(request, env, { error: "Tentativa não encontrada." }, 404);
  if (attempt.status !== "submitted") {
    return json(request, env, { error: "Entregue a prova para acessar a correção." }, 409);
  }
  const rows = await attemptQuestions(env, attemptId);
  const result: StudentTheoryResult = {
    id: attempt.id,
    beltId: attempt.belt_id,
    beltName: attempt.belt_name,
    score: attempt.score ?? 0,
    minimumScore: attempt.minimum_score,
    passed: attempt.passed === 1,
    startedAt: attempt.started_at,
    submittedAt: attempt.submitted_at || attempt.updated_at,
    questions: rows.map((row) => ({
      ...safeQuestion(row),
      explanation: row.explanation,
      correctOptionId: row.correct_option_id,
      awardedPoints: row.awarded_points ?? 0,
      correct: row.selected_option_id === row.correct_option_id,
    })),
  };
  return json(request, env, result);
}
