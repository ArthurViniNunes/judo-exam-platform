import type { AuthUser, ExamEventRow } from "./contracts";
import {
  canTransitionExamEvent,
  EVENT_STATUSES,
  type ExamEventStatus,
  validateEventEntryInput,
  validateExamEventInput,
} from "./exam-events-domain";
import { empty, json } from "./http";

type EventSummaryRow = ExamEventRow & {
  evaluator_count: number;
  entry_count: number;
  task_count: number;
  completed_count: number;
};

function auditStatement(
  request: Request,
  env: Env,
  user: AuthUser,
  action: string,
  eventId: string,
  metadata: Record<string, unknown> = {},
) {
  return env.DB.prepare(
    "INSERT INTO audit_events (id, actor_user_id, action, entity_type, entity_id, request_id, metadata_json) VALUES (?, ?, ?, 'exam_event', ?, ?, ?)",
  ).bind(
    crypto.randomUUID(),
    user.id,
    action,
    eventId,
    request.headers.get("X-Request-Id") || "unidentified",
    JSON.stringify(metadata),
  );
}

function formatSummary(row: EventSummaryRow) {
  return {
    id: row.id,
    name: row.name,
    eventDate: row.event_date,
    location: row.location,
    notes: row.notes,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    startedAt: row.started_at,
    closedAt: row.closed_at,
    archivedAt: row.archived_at,
    counts: {
      evaluators: Number(row.evaluator_count),
      students: Number(row.entry_count),
      tasks: Number(row.task_count),
      completed: Number(row.completed_count),
    },
  };
}

async function eventRow(env: Env, eventId: string) {
  return env.DB.prepare("SELECT * FROM exam_events WHERE id = ?")
    .bind(eventId)
    .first<ExamEventRow>();
}

async function canViewEvent(env: Env, user: AuthUser, eventId: string) {
  if (user.role === "super_admin") return true;
  return Boolean(
    await env.DB.prepare(
      "SELECT 1 AS allowed FROM exam_event_evaluators WHERE event_id = ? AND evaluator_id = ?",
    ).bind(eventId, user.id).first(),
  );
}

const eventSummarySelect = `
  SELECT events.*,
         (SELECT COUNT(*) FROM exam_event_evaluators WHERE event_id = events.id) AS evaluator_count,
         (SELECT COUNT(*) FROM exam_event_entries WHERE event_id = events.id) AS entry_count,
         (SELECT COUNT(*) FROM exam_event_tasks AS tasks
           JOIN exam_event_entries AS entries ON entries.id = tasks.entry_id
          WHERE entries.event_id = events.id) AS task_count,
         (SELECT COUNT(*) FROM exam_event_tasks AS tasks
           JOIN exam_event_entries AS entries ON entries.id = tasks.entry_id
          WHERE entries.event_id = events.id AND tasks.status = 'completed') AS completed_count
    FROM exam_events AS events`;

export async function listExamEvents(request: Request, env: Env, user: AuthUser) {
  const query = user.role === "super_admin"
    ? `${eventSummarySelect} ORDER BY events.event_date DESC, events.created_at DESC`
    : `${eventSummarySelect}
       JOIN exam_event_evaluators AS access
         ON access.event_id = events.id AND access.evaluator_id = ?
       ORDER BY events.event_date DESC, events.created_at DESC`;
  const result = user.role === "super_admin"
    ? await env.DB.prepare(query).all<EventSummaryRow>()
    : await env.DB.prepare(query).bind(user.id).all<EventSummaryRow>();
  return json(request, env, result.results.map(formatSummary));
}

export async function getExamEvent(
  request: Request,
  env: Env,
  user: AuthUser,
  eventId: string,
) {
  if (!(await canViewEvent(env, user, eventId))) {
    return json(request, env, { error: "Evento não encontrado." }, 404);
  }
  const [summary, evaluators, entries, tasks] = await Promise.all([
    env.DB.prepare(`${eventSummarySelect} WHERE events.id = ?`).bind(eventId).first<EventSummaryRow>(),
    env.DB.prepare(
      `SELECT users.id, users.name, users.email, users.evaluator_rank AS evaluatorRank,
              participants.station
         FROM exam_event_evaluators AS participants
         JOIN users ON users.id = participants.evaluator_id
        WHERE participants.event_id = ? ORDER BY users.name`,
    ).bind(eventId).all(),
    env.DB.prepare(
      `SELECT entries.id, entries.student_id AS studentId, students.name AS studentName,
              entries.belt_id AS beltId, entries.belt_name AS beltName,
              entries.eligibility_id AS eligibilityId, entries.created_at AS createdAt
         FROM exam_event_entries AS entries
         JOIN students ON students.id = entries.student_id
        WHERE entries.event_id = ? ORDER BY students.name`,
    ).bind(eventId).all(),
    env.DB.prepare(
      `SELECT tasks.id, tasks.entry_id AS entryId, tasks.modality, tasks.kata_type AS kataType,
              tasks.status, tasks.evaluator_id AS evaluatorId, users.name AS evaluatorName,
              tasks.station, tasks.claimed_at AS claimedAt, tasks.completed_at AS completedAt,
              tasks.evaluation_id AS evaluationId, tasks.lock_version AS lockVersion
         FROM exam_event_tasks AS tasks
         JOIN exam_event_entries AS entries ON entries.id = tasks.entry_id
         LEFT JOIN users ON users.id = tasks.evaluator_id
        WHERE entries.event_id = ? ORDER BY tasks.created_at`,
    ).bind(eventId).all(),
  ]);
  if (!summary) return json(request, env, { error: "Evento não encontrado." }, 404);
  return json(request, env, {
    ...formatSummary(summary),
    evaluators: evaluators.results,
    entries: entries.results,
    tasks: tasks.results,
  });
}

async function eventTask(
  env: Env,
  eventId: string,
  taskId: string,
) {
  return env.DB.prepare(
    `SELECT tasks.id, tasks.status, tasks.evaluator_id, tasks.evaluation_id,
            entries.event_id, events.status AS event_status
       FROM exam_event_tasks AS tasks
       JOIN exam_event_entries AS entries ON entries.id = tasks.entry_id
       JOIN exam_events AS events ON events.id = entries.event_id
      WHERE tasks.id = ? AND entries.event_id = ?`,
  ).bind(taskId, eventId).first<{
    id: string;
    status: "waiting" | "called" | "in_progress" | "pending_sync" | "completed";
    evaluator_id: string | null;
    evaluation_id: string | null;
    event_id: string;
    event_status: ExamEventStatus;
  }>();
}

export async function claimEventTask(
  request: Request,
  env: Env,
  user: AuthUser,
  eventId: string,
  taskId: string,
) {
  if (!(await canViewEvent(env, user, eventId))) {
    return json(request, env, { error: "Evento não encontrado." }, 404);
  }
  const task = await eventTask(env, eventId, taskId);
  if (!task) return json(request, env, { error: "Avaliação não encontrada." }, 404);
  if (task.event_status !== "in_progress") {
    return json(request, env, { error: "O evento precisa estar em andamento para assumir avaliações." }, 409);
  }
  if (task.evaluator_id === user.id && task.status === "in_progress") {
    return getExamEvent(request, env, user, eventId);
  }
  const claimed = await env.DB.prepare(
    `UPDATE exam_event_tasks
        SET evaluator_id = ?, status = 'in_progress', claimed_at = CURRENT_TIMESTAMP,
            lock_version = lock_version + 1
      WHERE id = ? AND evaluator_id IS NULL AND status IN ('waiting', 'called')
      RETURNING id`,
  ).bind(user.id, taskId).first<{ id: string }>();
  if (!claimed) {
    return json(request, env, { error: "Esta avaliação já foi assumida por outro avaliador." }, 409);
  }
  await auditStatement(request, env, user, "exam_event.task_claimed", eventId, { taskId }).run();
  return getExamEvent(request, env, user, eventId);
}

export async function releaseEventTask(
  request: Request,
  env: Env,
  user: AuthUser,
  eventId: string,
  taskId: string,
) {
  if (!(await canViewEvent(env, user, eventId))) {
    return json(request, env, { error: "Evento não encontrado." }, 404);
  }
  const task = await eventTask(env, eventId, taskId);
  if (!task) return json(request, env, { error: "Avaliação não encontrada." }, 404);
  if (task.evaluator_id !== user.id && user.role !== "super_admin") {
    return json(request, env, { error: "Somente o responsável ou o Super Admin pode liberar esta avaliação." }, 403);
  }
  if (task.status !== "in_progress" || task.evaluation_id) {
    return json(request, env, { error: "Somente uma avaliação ainda não concluída pode ser liberada." }, 409);
  }
  const released = await env.DB.prepare(
    `UPDATE exam_event_tasks
        SET evaluator_id = NULL, status = 'waiting', claimed_at = NULL,
            station = NULL, lock_version = lock_version + 1
      WHERE id = ? AND status = 'in_progress' AND evaluation_id IS NULL
      RETURNING id`,
  ).bind(taskId).first<{ id: string }>();
  if (!released) return json(request, env, { error: "A avaliação mudou de estado. Atualize o evento." }, 409);
  await auditStatement(request, env, user, "exam_event.task_released", eventId, { taskId }).run();
  return getExamEvent(request, env, user, eventId);
}

export async function createExamEvent(
  request: Request,
  env: Env,
  user: AuthUser,
) {
  const body = await request.json<Record<string, unknown>>();
  const valid = validateExamEventInput(body);
  if (typeof valid === "string") return json(request, env, { error: valid }, 400);
  const id = crypto.randomUUID();
  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO exam_events (id, name, event_date, location, notes, created_by) VALUES (?, ?, ?, ?, ?, ?)",
    ).bind(id, valid.name, valid.eventDate, valid.location, valid.notes, user.id),
    auditStatement(request, env, user, "exam_event.created", id),
  ]);
  return getExamEvent(request, env, user, id).then(async (response) =>
    json(request, env, await response.json(), 201),
  );
}

export async function updateExamEvent(
  request: Request,
  env: Env,
  user: AuthUser,
  eventId: string,
) {
  const current = await eventRow(env, eventId);
  if (!current) return json(request, env, { error: "Evento não encontrado." }, 404);
  if (current.status !== "draft" && current.status !== "open") {
    return json(request, env, { error: "Somente eventos em preparação podem ser editados." }, 409);
  }
  const body = await request.json<Record<string, unknown>>();
  const valid = validateExamEventInput({
    name: body.name ?? current.name,
    eventDate: body.eventDate ?? current.event_date,
    location: body.location ?? current.location ?? "",
    notes: body.notes ?? current.notes ?? "",
  });
  if (typeof valid === "string") return json(request, env, { error: valid }, 400);
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE exam_events SET name = ?, event_date = ?, location = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    ).bind(valid.name, valid.eventDate, valid.location, valid.notes, eventId),
    auditStatement(request, env, user, "exam_event.updated", eventId),
  ]);
  return getExamEvent(request, env, user, eventId);
}

export async function transitionExamEvent(
  request: Request,
  env: Env,
  user: AuthUser,
  eventId: string,
) {
  const body = await request.json<{ status?: string }>();
  const current = await eventRow(env, eventId);
  if (!current) return json(request, env, { error: "Evento não encontrado." }, 404);
  const next = body.status as ExamEventStatus;
  if (!EVENT_STATUSES.includes(next) || !canTransitionExamEvent(current.status, next)) {
    return json(request, env, { error: "Esta mudança de estado não é permitida." }, 409);
  }
  if (next === "in_progress") {
    const readiness = await env.DB.prepare(
      `SELECT
         (SELECT COUNT(*) FROM exam_event_evaluators WHERE event_id = ?) AS evaluators,
         (SELECT COUNT(*) FROM exam_event_entries WHERE event_id = ?) AS entries`,
    ).bind(eventId, eventId).first<{ evaluators: number; entries: number }>();
    if (!readiness?.evaluators || !readiness.entries) {
      return json(request, env, { error: "Adicione ao menos um avaliador e um judoca antes de iniciar." }, 409);
    }
  }
  if (next === "closed") {
    const pending = await env.DB.prepare(
      `SELECT COUNT(*) AS total FROM exam_event_tasks AS tasks
       JOIN exam_event_entries AS entries ON entries.id = tasks.entry_id
       WHERE entries.event_id = ? AND tasks.status <> 'completed'`,
    ).bind(eventId).first<{ total: number }>();
    if (Number(pending?.total)) {
      return json(request, env, { error: "Conclua todas as avaliações antes de encerrar o evento.", pending: Number(pending?.total) }, 409);
    }
  }
  const timestampColumn = next === "in_progress"
    ? "started_at"
    : next === "closed"
      ? "closed_at"
      : next === "archived"
        ? "archived_at"
        : null;
  const timestampSql = timestampColumn ? `, ${timestampColumn} = CURRENT_TIMESTAMP` : "";
  await env.DB.batch([
    env.DB.prepare(
      `UPDATE exam_events SET status = ?, updated_at = CURRENT_TIMESTAMP${timestampSql} WHERE id = ? AND status = ?`,
    ).bind(next, eventId, current.status),
    auditStatement(request, env, user, "exam_event.status_changed", eventId, { from: current.status, to: next }),
  ]);
  return getExamEvent(request, env, user, eventId);
}

export async function addEventEvaluator(
  request: Request,
  env: Env,
  user: AuthUser,
  eventId: string,
) {
  const event = await eventRow(env, eventId);
  if (!event) return json(request, env, { error: "Evento não encontrado." }, 404);
  if (event.status !== "draft" && event.status !== "open") {
    return json(request, env, { error: "A equipe deste evento não pode mais ser alterada." }, 409);
  }
  const body = await request.json<{ evaluatorId?: string; station?: string }>();
  const evaluatorId = body.evaluatorId?.trim() || "";
  const station = body.station?.trim().replace(/\s+/g, " ") || null;
  if (!evaluatorId || (station?.length ?? 0) > 80) {
    return json(request, env, { error: "Selecione um avaliador e informe uma estação válida." }, 400);
  }
  const evaluator = await env.DB.prepare(
    `SELECT users.id FROM users WHERE users.id = ? AND users.status <> 'disabled'
      AND EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = users.id
        AND user_roles.role IN ('evaluator', 'super_admin') AND user_roles.status = 'active')`,
  ).bind(evaluatorId).first();
  if (!evaluator) return json(request, env, { error: "Avaliador ativo não encontrado." }, 404);
  try {
    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO exam_event_evaluators (event_id, evaluator_id, station) VALUES (?, ?, ?)",
      ).bind(eventId, evaluatorId, station),
      auditStatement(request, env, user, "exam_event.evaluator_added", eventId, { evaluatorId }),
    ]);
  } catch {
    return json(request, env, { error: "Este avaliador já participa do evento." }, 409);
  }
  return getExamEvent(request, env, user, eventId);
}

export async function removeEventEvaluator(
  request: Request,
  env: Env,
  user: AuthUser,
  eventId: string,
  evaluatorId: string,
) {
  const event = await eventRow(env, eventId);
  if (!event) return json(request, env, { error: "Evento não encontrado." }, 404);
  if (event.status !== "draft" && event.status !== "open") {
    return json(request, env, { error: "A equipe deste evento não pode mais ser alterada." }, 409);
  }
  const assigned = await env.DB.prepare(
    `SELECT 1 FROM exam_event_tasks AS tasks
     JOIN exam_event_entries AS entries ON entries.id = tasks.entry_id
     WHERE entries.event_id = ? AND tasks.evaluator_id = ? LIMIT 1`,
  ).bind(eventId, evaluatorId).first();
  if (assigned) return json(request, env, { error: "Reatribua as avaliações deste profissional antes de removê-lo." }, 409);
  await env.DB.batch([
    env.DB.prepare("DELETE FROM exam_event_evaluators WHERE event_id = ? AND evaluator_id = ?").bind(eventId, evaluatorId),
    auditStatement(request, env, user, "exam_event.evaluator_removed", eventId, { evaluatorId }),
  ]);
  return empty(request, env);
}

export async function addEventEntry(
  request: Request,
  env: Env,
  user: AuthUser,
  eventId: string,
) {
  const event = await eventRow(env, eventId);
  if (!event) return json(request, env, { error: "Evento não encontrado." }, 404);
  if (event.status !== "draft" && event.status !== "open") {
    return json(request, env, { error: "As inscrições deste evento estão encerradas." }, 409);
  }
  const body = await request.json<Record<string, unknown>>();
  const valid = validateEventEntryInput(body);
  if (typeof valid === "string") return json(request, env, { error: valid }, 400);
  const eligibility = await env.DB.prepare(
    `SELECT eligibilities.id, eligibilities.belt_id, eligibilities.belt_name, students.name
       FROM student_eligibilities AS eligibilities
       JOIN students ON students.id = eligibilities.student_id
      WHERE eligibilities.student_id = ? AND eligibilities.revoked_at IS NULL
        AND (eligibilities.valid_until IS NULL OR eligibilities.valid_until > CURRENT_TIMESTAMP)
      ORDER BY eligibilities.valid_from DESC LIMIT 1`,
  ).bind(valid.studentId).first<{ id: string; belt_id: string; belt_name: string; name: string }>();
  if (!eligibility) {
    return json(request, env, { error: "O judoca precisa estar aprovado no exame teórico para entrar no evento." }, 409);
  }
  const entryId = crypto.randomUUID();
  const tasks = [
    ...(valid.technical ? [{ modality: "technical", kataType: null }] : []),
    ...(valid.kataType ? [{ modality: "kata", kataType: valid.kataType }] : []),
  ];
  try {
    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO exam_event_entries (id, event_id, student_id, belt_id, belt_name, eligibility_id) VALUES (?, ?, ?, ?, ?, ?)",
      ).bind(entryId, eventId, valid.studentId, eligibility.belt_id, eligibility.belt_name, eligibility.id),
      ...tasks.map((task) => env.DB.prepare(
        "INSERT INTO exam_event_tasks (id, entry_id, modality, kata_type) VALUES (?, ?, ?, ?)",
      ).bind(crypto.randomUUID(), entryId, task.modality, task.kataType)),
      auditStatement(request, env, user, "exam_event.student_added", eventId, {
        studentId: valid.studentId,
        modalities: tasks.map((task) => task.modality),
      }),
    ]);
  } catch {
    return json(request, env, { error: "Este judoca já está inscrito no evento." }, 409);
  }
  return getExamEvent(request, env, user, eventId);
}

export async function removeEventEntry(
  request: Request,
  env: Env,
  user: AuthUser,
  eventId: string,
  entryId: string,
) {
  const event = await eventRow(env, eventId);
  if (!event) return json(request, env, { error: "Evento não encontrado." }, 404);
  if (event.status !== "draft" && event.status !== "open") {
    return json(request, env, { error: "As inscrições deste evento estão encerradas." }, 409);
  }
  const active = await env.DB.prepare(
    "SELECT 1 FROM exam_event_tasks WHERE entry_id = ? AND status <> 'waiting' LIMIT 1",
  ).bind(entryId).first();
  if (active) return json(request, env, { error: "Este judoca já possui uma avaliação em andamento." }, 409);
  await env.DB.batch([
    env.DB.prepare("DELETE FROM exam_event_entries WHERE id = ? AND event_id = ?").bind(entryId, eventId),
    auditStatement(request, env, user, "exam_event.student_removed", eventId, { entryId }),
  ]);
  return empty(request, env);
}
