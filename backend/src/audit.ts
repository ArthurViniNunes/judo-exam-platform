import type { AuthUser } from "./contracts";
import { json } from "./http";

type AuditMetadata = Record<string, unknown>;

type AuditEventRow = {
  id: string;
  actor_user_id: string | null;
  actor_name: string | null;
  actor_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  request_id: string;
  metadata_json: string;
  created_at: string;
};

type AuditCursor = { createdAt: string; id: string };

const AUDIT_PAGE_SIZE = 30;
const SQL_TIMESTAMP = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

function bounded(value: string | null, maximum: number) {
  return value?.trim().slice(0, maximum) || "";
}

export function isAuditDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function encodeAuditCursor(cursor: AuditCursor) {
  return btoa(`${cursor.createdAt}|${cursor.id}`);
}

export function decodeAuditCursor(value: string): AuditCursor | null {
  try {
    const decoded = atob(value);
    const separator = decoded.indexOf("|");
    const createdAt = decoded.slice(0, separator);
    const id = decoded.slice(separator + 1);
    if (separator < 1 || !SQL_TIMESTAMP.test(createdAt) || !id || id.length > 100) {
      return null;
    }
    return { createdAt, id };
  } catch {
    return null;
  }
}

export function parseAuditMetadata(value: string): AuditMetadata {
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as AuditMetadata
      : {};
  } catch {
    return {};
  }
}

function likeValue(value: string) {
  return `%${value.replace(/[\\%_]/g, "\\$&")}%`;
}

function prepared(
  env: Env,
  query: string,
  values: Array<string | number>,
) {
  const statement = env.DB.prepare(query);
  return values.length ? statement.bind(...values) : statement;
}

export function auditStatement(
  request: Request,
  env: Env,
  actor: Pick<AuthUser, "id">,
  action: string,
  entityType: string,
  entityId: string,
  metadata: AuditMetadata = {},
) {
  return env.DB.prepare(
    "INSERT INTO audit_events (id, actor_user_id, action, entity_type, entity_id, request_id, metadata_json) VALUES (?, ?, ?, ?, ?, ?, ?)",
  ).bind(
    crypto.randomUUID(),
    actor.id,
    action,
    entityType,
    entityId,
    request.headers.get("X-Request-Id") || crypto.randomUUID(),
    JSON.stringify(metadata),
  );
}

export function systemAuditStatement(
  request: Request,
  env: Env,
  action: string,
  entityType: string,
  entityId: string,
  metadata: AuditMetadata = {},
) {
  return env.DB.prepare(
    "INSERT INTO audit_events (id, actor_user_id, action, entity_type, entity_id, request_id, metadata_json) VALUES (?, NULL, ?, ?, ?, ?, ?)",
  ).bind(
    crypto.randomUUID(),
    action,
    entityType,
    entityId,
    request.headers.get("X-Request-Id") || crypto.randomUUID(),
    JSON.stringify(metadata),
  );
}

export async function listAuditEvents(
  request: Request,
  env: Env,
  url: URL,
) {
  const actorId = bounded(url.searchParams.get("actor"), 100);
  const action = bounded(url.searchParams.get("action"), 100);
  const entityType = bounded(url.searchParams.get("entity"), 100);
  const query = bounded(url.searchParams.get("q"), 100);
  const dateFrom = bounded(url.searchParams.get("from"), 10);
  const dateTo = bounded(url.searchParams.get("to"), 10);
  const cursorValue = bounded(url.searchParams.get("cursor"), 300);

  if ((dateFrom && !isAuditDate(dateFrom)) || (dateTo && !isAuditDate(dateTo))) {
    return json(request, env, { error: "Informe um período válido para a auditoria." }, 400);
  }
  if (dateFrom && dateTo && dateFrom > dateTo) {
    return json(request, env, { error: "A data inicial não pode ser posterior à data final." }, 400);
  }
  const cursor = cursorValue ? decodeAuditCursor(cursorValue) : null;
  if (cursorValue && !cursor) {
    return json(request, env, { error: "A continuação desta consulta não é válida." }, 400);
  }

  const conditions: string[] = [];
  const values: Array<string | number> = [];
  if (actorId) {
    conditions.push("audit_events.actor_user_id = ?");
    values.push(actorId);
  }
  if (action) {
    conditions.push("audit_events.action = ?");
    values.push(action);
  }
  if (entityType) {
    conditions.push("audit_events.entity_type = ?");
    values.push(entityType);
  }
  if (dateFrom) {
    conditions.push("audit_events.created_at >= ?");
    values.push(`${dateFrom} 00:00:00`);
  }
  if (dateTo) {
    conditions.push("audit_events.created_at < datetime(?, '+1 day')");
    values.push(`${dateTo} 00:00:00`);
  }
  if (query) {
    conditions.push(
      "(audit_events.entity_id LIKE ? ESCAPE '\\' OR audit_events.request_id LIKE ? ESCAPE '\\' OR users.name LIKE ? ESCAPE '\\')",
    );
    const pattern = likeValue(query);
    values.push(pattern, pattern, pattern);
  }

  const baseWhere = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const pageConditions = [...conditions];
  const pageValues = [...values];
  if (cursor) {
    pageConditions.push(
      "(audit_events.created_at < ? OR (audit_events.created_at = ? AND audit_events.id < ?))",
    );
    pageValues.push(cursor.createdAt, cursor.createdAt, cursor.id);
  }
  const pageWhere = pageConditions.length ? `WHERE ${pageConditions.join(" AND ")}` : "";

  const [events, count, actions, entities, actors] = await Promise.all([
    prepared(
      env,
      `SELECT audit_events.*, users.name AS actor_name, users.email AS actor_email
         FROM audit_events
         LEFT JOIN users ON users.id = audit_events.actor_user_id
         ${pageWhere}
        ORDER BY audit_events.created_at DESC, audit_events.id DESC
        LIMIT ?`,
      [...pageValues, AUDIT_PAGE_SIZE + 1],
    ).all<AuditEventRow>(),
    prepared(
      env,
      `SELECT COUNT(*) AS total
         FROM audit_events
         LEFT JOIN users ON users.id = audit_events.actor_user_id
         ${baseWhere}`,
      values,
    ).first<{ total: number }>(),
    env.DB.prepare("SELECT DISTINCT action AS value FROM audit_events ORDER BY action")
      .all<{ value: string }>(),
    env.DB.prepare("SELECT DISTINCT entity_type AS value FROM audit_events ORDER BY entity_type")
      .all<{ value: string }>(),
    env.DB.prepare(
      `SELECT DISTINCT users.id, users.name
         FROM audit_events
         INNER JOIN users ON users.id = audit_events.actor_user_id
        ORDER BY users.name`,
    ).all<{ id: string; name: string }>(),
  ]);

  const hasMore = events.results.length > AUDIT_PAGE_SIZE;
  const rows = hasMore ? events.results.slice(0, AUDIT_PAGE_SIZE) : events.results;
  const last = rows.at(-1);

  return json(request, env, {
    items: rows.map((row) => ({
      id: row.id,
      actorId: row.actor_user_id,
      actorName: row.actor_name || "Sistema",
      actorEmail: row.actor_email,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      requestId: row.request_id,
      metadata: parseAuditMetadata(row.metadata_json),
      createdAt: row.created_at,
    })),
    total: Number(count?.total ?? 0),
    nextCursor: hasMore && last
      ? encodeAuditCursor({ createdAt: last.created_at, id: last.id })
      : null,
    filters: {
      actions: actions.results.map((entry) => entry.value),
      entityTypes: entities.results.map((entry) => entry.value),
      actors: actors.results,
    },
  });
}
