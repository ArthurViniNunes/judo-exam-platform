import { describe, expect, it } from "vitest";
import {
  summarizeSync,
  syncRetryDelay,
  type OutboxRecord,
  type OutboxStatus,
} from "../lib/offline-evaluations";

function record(status: OutboxStatus, id: string = status): OutboxRecord {
  return {
    id,
    userId: "user-1",
    payload: {
      id,
      studentId: "student-1",
      belt: "Faixa amarela",
      type: "técnica",
      score: 80,
    },
    status,
    attempts: 0,
    createdAt: "2026-10-21T12:00:00.000Z",
    updatedAt: "2026-10-21T12:00:00.000Z",
    nextAttemptAt: "2026-10-21T12:00:00.000Z",
    syncedAt: status === "synced" ? "2026-10-21T12:00:00.000Z" : null,
    lastError: null,
  };
}

describe("persistência offline", () => {
  it("aplica espera progressiva com limite de um minuto", () => {
    expect(syncRetryDelay(1)).toBe(1_000);
    expect(syncRetryDelay(2)).toBe(2_000);
    expect(syncRetryDelay(5)).toBe(16_000);
    expect(syncRetryDelay(20)).toBe(60_000);
  });

  it("prioriza pendências que requerem atenção no resumo", () => {
    expect(
      summarizeSync([
        record("synced", "1"),
        record("syncing", "2"),
        record("attention_required", "3"),
      ]),
    ).toEqual({
      status: "attention_required",
      pendingCount: 2,
      attentionCount: 1,
    });
  });

  it("diferencia fila local, sincronização e confirmação do servidor", () => {
    expect(summarizeSync([record("queued")]).status).toBe("queued");
    expect(summarizeSync([record("syncing")]).status).toBe("syncing");
    expect(summarizeSync([record("synced")]).status).toBe("synced");
    expect(summarizeSync([]).status).toBe("idle");
  });
});
