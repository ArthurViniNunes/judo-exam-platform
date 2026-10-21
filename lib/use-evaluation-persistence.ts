"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiRequest } from "./api";
import {
  MAX_AUTOMATIC_SYNC_ATTEMPTS,
  cleanupSyncedRecords,
  deleteEvaluationDraft,
  listEvaluationDrafts,
  listOutboxRecords,
  queueEvaluationLocally,
  saveEvaluationDraft,
  saveOutboxRecord,
  summarizeSync,
  syncRetryDelay,
  type EvaluationDraft,
  type OutboxRecord,
} from "./offline-evaluations";
import type { EvaluationSubmission } from "./platform";

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Não foi possível sincronizar a avaliação.";
}

export function useEvaluationPersistence(userId: string | undefined) {
  const [drafts, setDrafts] = useState<EvaluationDraft[]>([]);
  const [outbox, setOutbox] = useState<OutboxRecord[]>([]);
  const [storageError, setStorageError] = useState("");
  const syncing = useRef(false);

  const refresh = useCallback(async () => {
    if (!userId) {
      setDrafts([]);
      setOutbox([]);
      return;
    }
    try {
      const [storedDrafts, storedOutbox] = await Promise.all([
        listEvaluationDrafts(userId),
        listOutboxRecords(userId),
      ]);
      setDrafts(storedDrafts);
      setOutbox(storedOutbox);
      setStorageError("");
    } catch (error) {
      setStorageError(errorMessage(error));
    }
  }, [userId]);

  const syncNow = useCallback(
    async (force = false) => {
      if (!userId || syncing.current || !navigator.onLine) return;
      syncing.current = true;
      try {
        const records = await listOutboxRecords(userId);
        for (const record of records) {
          const due = new Date(record.nextAttemptAt).getTime() <= Date.now();
          if (record.status === "synced") continue;
          if (record.status === "attention_required" && !force) continue;
          if (!due && !force) continue;

          const syncingRecord: OutboxRecord = {
            ...record,
            status: "syncing",
            updatedAt: new Date().toISOString(),
          };
          await saveOutboxRecord(syncingRecord);
          await refresh();

          try {
            await apiRequest("/api/evaluations/sync", {
              method: "POST",
              headers: { "X-Request-Id": crypto.randomUUID() },
              body: JSON.stringify(record.payload),
            });
            const syncedAt = new Date().toISOString();
            await saveOutboxRecord({
              ...syncingRecord,
              status: "synced",
              updatedAt: syncedAt,
              syncedAt,
              lastError: null,
            });
          } catch (error) {
            const attempts = record.attempts + 1;
            const needsAttention = attempts >= MAX_AUTOMATIC_SYNC_ATTEMPTS;
            await saveOutboxRecord({
              ...record,
              status: needsAttention ? "attention_required" : "queued",
              attempts,
              updatedAt: new Date().toISOString(),
              nextAttemptAt: new Date(
                Date.now() + syncRetryDelay(attempts),
              ).toISOString(),
              lastError: errorMessage(error),
            });
          }
        }
        await cleanupSyncedRecords(userId);
      } finally {
        syncing.current = false;
        await refresh();
      }
    },
    [refresh, userId],
  );

  useEffect(() => {
    if (!userId) return;
    void cleanupSyncedRecords(userId)
      .then(refresh)
      .then(() => syncNow());
    const retry = () => void syncNow();
    window.addEventListener("online", retry);
    const interval = window.setInterval(retry, 5_000);
    return () => {
      window.removeEventListener("online", retry);
      window.clearInterval(interval);
    };
  }, [refresh, syncNow, userId]);

  const saveDraft = useCallback(
    async (draft: EvaluationDraft) => {
      await saveEvaluationDraft({ ...draft, updatedAt: new Date().toISOString() });
      await refresh();
    },
    [refresh],
  );

  const discardDraft = useCallback(
    async (id: string) => {
      await deleteEvaluationDraft(id);
      await refresh();
    },
    [refresh],
  );

  const queueEvaluation = useCallback(
    async (payload: EvaluationSubmission, draftId?: string) => {
      if (!userId) throw new Error("Entre novamente para salvar a avaliação.");
      const now = new Date().toISOString();
      await queueEvaluationLocally(
        {
          id: payload.id,
          userId,
          payload,
          status: "queued",
          attempts: 0,
          createdAt: now,
          updatedAt: now,
          nextAttemptAt: now,
          syncedAt: null,
          lastError: null,
        },
        draftId,
      );
      await refresh();
      void syncNow();
    },
    [refresh, syncNow, userId],
  );

  const summary = useMemo(() => summarizeSync(outbox), [outbox]);
  const pendingDrafts = drafts.length;

  return {
    drafts,
    outbox,
    summary,
    storageError,
    pendingDrafts,
    hasPendingData: pendingDrafts > 0 || summary.pendingCount > 0,
    refresh,
    saveDraft,
    discardDraft,
    queueEvaluation,
    retrySync: () => syncNow(true),
    recordFor: (id: string) => outbox.find((record) => record.id === id),
  };
}
