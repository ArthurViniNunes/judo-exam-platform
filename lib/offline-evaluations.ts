import type { KataId, KataMark, KataMode } from "./kata-exams";
import type { EvaluationSubmission } from "./platform";
import type { ExamCategory, PracticalBeltId } from "./practical-exams";

const DATABASE_NAME = "ajrc-evaluations";
const DATABASE_VERSION = 1;
const DRAFT_STORE = "drafts";
const OUTBOX_STORE = "outbox";
export const SYNCED_RETENTION_MS = 24 * 60 * 60 * 1000;
export const MAX_AUTOMATIC_SYNC_ATTEMPTS = 5;

export type DraftSaveState = "saving" | "saved" | "error";
export type OutboxStatus =
  | "queued"
  | "syncing"
  | "synced"
  | "attention_required";

export type TechnicalDraftState = {
  exam: ExamCategory[];
  groupIndex: number;
  standardScores: Record<string, number>;
  sequenceScores: Record<string, Record<number, number>>;
  notes: string;
};

export type KataDraftState = {
  marks: Record<string, KataMark>;
  notes: string;
};

type DraftBase = {
  id: string;
  userId: string;
  eventId?: string;
  eventTaskId?: string;
  studentId: string;
  athlete: string;
  createdAt: string;
  updatedAt: string;
};

export type TechnicalDraft = DraftBase & {
  kind: "technical";
  beltId: PracticalBeltId;
  data: TechnicalDraftState;
};

export type KataDraft = DraftBase & {
  kind: "kata";
  kataId: KataId;
  mode: KataMode;
  data: KataDraftState;
};

export type EvaluationDraft = TechnicalDraft | KataDraft;

export type OutboxRecord = {
  id: string;
  userId: string;
  payload: EvaluationSubmission;
  status: OutboxStatus;
  attempts: number;
  createdAt: string;
  updatedAt: string;
  nextAttemptAt: string;
  syncedAt: string | null;
  lastError: string | null;
};

export type SyncSummary = {
  status: "idle" | OutboxStatus;
  pendingCount: number;
  attentionCount: number;
};

function openDatabase(): Promise<IDBDatabase> {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return Promise.reject(new Error("O armazenamento offline não está disponível neste navegador."));
  }

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(DRAFT_STORE)) {
        database.createObjectStore(DRAFT_STORE, { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains(OUTBOX_STORE)) {
        database.createObjectStore(OUTBOX_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Não foi possível abrir os dados offline."));
    request.onblocked = () => reject(new Error("Feche outras abas da plataforma e tente novamente."));
  });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Falha ao salvar os dados no aparelho."));
    transaction.onabort = () => reject(transaction.error ?? new Error("O salvamento local foi interrompido."));
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Falha ao consultar os dados do aparelho."));
  });
}

export async function saveEvaluationDraft(draft: EvaluationDraft) {
  const database = await openDatabase();
  const transaction = database.transaction(DRAFT_STORE, "readwrite");
  const completion = transactionComplete(transaction);
  transaction.objectStore(DRAFT_STORE).put(draft);
  await completion;
  database.close();
}

export async function listEvaluationDrafts(userId: string) {
  const database = await openDatabase();
  const transaction = database.transaction(DRAFT_STORE, "readonly");
  const completion = transactionComplete(transaction);
  const drafts = await requestResult(
    transaction.objectStore(DRAFT_STORE).getAll() as IDBRequest<EvaluationDraft[]>,
  );
  await completion;
  database.close();
  return drafts
    .filter((draft) => draft.userId === userId)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function deleteEvaluationDraft(id: string) {
  const database = await openDatabase();
  const transaction = database.transaction(DRAFT_STORE, "readwrite");
  const completion = transactionComplete(transaction);
  transaction.objectStore(DRAFT_STORE).delete(id);
  await completion;
  database.close();
}

export async function queueEvaluationLocally(
  record: OutboxRecord,
  draftId?: string,
) {
  const database = await openDatabase();
  const transaction = database.transaction(
    [DRAFT_STORE, OUTBOX_STORE],
    "readwrite",
  );
  const completion = transactionComplete(transaction);
  transaction.objectStore(OUTBOX_STORE).put(record);
  if (draftId) transaction.objectStore(DRAFT_STORE).delete(draftId);
  await completion;
  database.close();
}

export async function listOutboxRecords(userId: string) {
  const database = await openDatabase();
  const transaction = database.transaction(OUTBOX_STORE, "readonly");
  const completion = transactionComplete(transaction);
  const records = await requestResult(
    transaction.objectStore(OUTBOX_STORE).getAll() as IDBRequest<OutboxRecord[]>,
  );
  await completion;
  database.close();
  return records
    .filter((record) => record.userId === userId)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function saveOutboxRecord(record: OutboxRecord) {
  const database = await openDatabase();
  const transaction = database.transaction(OUTBOX_STORE, "readwrite");
  const completion = transactionComplete(transaction);
  transaction.objectStore(OUTBOX_STORE).put(record);
  await completion;
  database.close();
}

export async function cleanupSyncedRecords(
  userId: string,
  now = Date.now(),
) {
  const records = await listOutboxRecords(userId);
  const expired = records.filter(
    (record) =>
      record.status === "synced" &&
      record.syncedAt !== null &&
      now - new Date(record.syncedAt).getTime() >= SYNCED_RETENTION_MS,
  );
  if (!expired.length) return;

  const database = await openDatabase();
  const transaction = database.transaction(OUTBOX_STORE, "readwrite");
  const completion = transactionComplete(transaction);
  const store = transaction.objectStore(OUTBOX_STORE);
  for (const record of expired) store.delete(record.id);
  await completion;
  database.close();
}

export async function clearSyncedUserData(userId: string) {
  const records = await listOutboxRecords(userId);
  const database = await openDatabase();
  const transaction = database.transaction(
    [DRAFT_STORE, OUTBOX_STORE],
    "readwrite",
  );
  const completion = transactionComplete(transaction);
  const outbox = transaction.objectStore(OUTBOX_STORE);
  for (const record of records) {
    if (record.status === "synced") outbox.delete(record.id);
  }
  await completion;
  database.close();
}

export function syncRetryDelay(attempt: number) {
  return Math.min(1_000 * 2 ** Math.max(0, attempt - 1), 60_000);
}

export function summarizeSync(records: OutboxRecord[]): SyncSummary {
  const pending = records.filter((record) => record.status !== "synced");
  const attentionCount = pending.filter(
    (record) => record.status === "attention_required",
  ).length;
  if (attentionCount) {
    return { status: "attention_required", pendingCount: pending.length, attentionCount };
  }
  if (pending.some((record) => record.status === "syncing")) {
    return { status: "syncing", pendingCount: pending.length, attentionCount: 0 };
  }
  if (pending.length) {
    return { status: "queued", pendingCount: pending.length, attentionCount: 0 };
  }
  if (records.some((record) => record.status === "synced")) {
    return { status: "synced", pendingCount: 0, attentionCount: 0 };
  }
  return { status: "idle", pendingCount: 0, attentionCount: 0 };
}
