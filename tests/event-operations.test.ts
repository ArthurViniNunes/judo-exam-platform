import { describe, expect, it } from "vitest";
import { eventOperationalSummary } from "../lib/event-operations";
import type { ExamEventTask } from "../lib/platform";

function task(
  id: string,
  status: ExamEventTask["status"],
  claimedAt: string | null = null,
  completedAt: string | null = null,
): ExamEventTask {
  return {
    id,
    entryId: `entry-${id}`,
    modality: "technical",
    kataType: null,
    status,
    evaluatorId: null,
    evaluatorName: null,
    station: null,
    claimedAt,
    completedAt,
    evaluationId: status === "completed" ? `evaluation-${id}` : null,
    lockVersion: 1,
    deviceId: null,
    deviceLabel: null,
    lastSyncAt: null,
  };
}

describe("operação do dia de exame", () => {
  it("lista tudo que ainda impede o encerramento", () => {
    const summary = eventOperationalSummary([
      task("waiting", "waiting"),
      task("called", "called"),
      task("active", "in_progress", "2026-10-22 12:00:00"),
      task("sync", "pending_sync"),
      task("done", "completed", "2026-10-22 11:00:00", "2026-10-22 11:12:00"),
    ], Date.parse("2026-10-22T12:18:00Z"));

    expect(summary.blockers).toBe(4);
    expect(summary.readyToClose).toBe(false);
    expect(summary.longestActiveMinutes).toBe(18);
  });

  it("calcula a duração média e libera apenas um evento totalmente concluído", () => {
    const summary = eventOperationalSummary([
      task("first", "completed", "2026-10-22 11:00:00", "2026-10-22 11:10:00"),
      task("second", "completed", "2026-10-22 11:20:00", "2026-10-22 11:40:00"),
    ]);

    expect(summary.averageDurationMinutes).toBe(15);
    expect(summary.blockers).toBe(0);
    expect(summary.readyToClose).toBe(true);
  });

  it("não trata um evento sem avaliações como pronto para encerrar", () => {
    expect(eventOperationalSummary([]).readyToClose).toBe(false);
  });
});
