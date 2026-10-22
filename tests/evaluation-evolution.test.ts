import { describe, expect, it } from "vitest";
import {
  buildStudentEvolution,
  evaluationSeriesKey,
  filterStudentHistory,
  latestComparableTrend,
} from "../lib/evaluation-evolution";
import type { EvaluationRecord } from "../lib/platform";

function evaluation(
  id: string,
  createdAt: string,
  score: number,
  overrides: Partial<EvaluationRecord> = {},
): EvaluationRecord {
  return {
    id,
    athlete: "Judoca",
    studentId: "student-1",
    evaluatorId: "evaluator-1",
    evaluatorName: "Avaliador",
    evaluatorRank: "Faixa Preta",
    eligibilityId: null,
    eventTaskId: null,
    eventName: null,
    belt: "Cinza",
    type: "técnica",
    score,
    result: "Aprovado",
    matrixId: null,
    detail: null,
    createdAt,
    deletedAt: null,
    deletedBy: null,
    deleteReason: null,
    categories: [],
    items: [],
    ...overrides,
  };
}

describe("evolução individual", () => {
  it("separa modalidades, graduações e matrizes em séries diferentes", () => {
    const technical = evaluation("technical", "2026-01-01", 70);
    const kata = evaluation("kata", "2026-02-01", 90, { type: "kata" });
    const custom = evaluation("custom", "2026-03-01", 80, { matrixId: "matrix-1" });

    const result = buildStudentEvolution([technical, kata, custom], "");

    expect(result.options).toHaveLength(3);
    expect(result.activeKey).toBe(evaluationSeriesKey(custom));
    expect(result.series.map((item) => item.id)).toEqual(["custom"]);
  });

  it("compara a avaliação mais recente somente com uma prova compatível", () => {
    const first = evaluation("first", "2026-01-01", 70);
    const kata = evaluation("kata", "2026-02-01", 95, { type: "kata" });
    const latest = evaluation("latest", "2026-03-01", 85);

    expect(latestComparableTrend([first, kata, latest])).toEqual({
      score: 85,
      difference: 15,
    });
  });

  it("calcula categorias e técnicas com dificuldade recorrente", () => {
    const first = evaluation("first", "2026-01-01", 70, {
      categories: [{ id: "c1", name: "Nage Waza", score: 60 }],
      items: [{
        id: "i1",
        category: "Nage Waza",
        name: "O-soto-gari",
        score: 50,
        detail: null,
        parts: [],
      }],
    });
    const latest = evaluation("latest", "2026-02-01", 80, {
      categories: [{ id: "c2", name: "Nage Waza", score: 80 }],
      items: [{
        id: "i2",
        category: "Nage Waza",
        name: "O-soto-gari",
        score: 70,
        detail: null,
        parts: [],
      }],
    });

    const result = buildStudentEvolution([latest, first], "");

    expect(result.overallDifference).toBe(10);
    expect(result.categories).toEqual([
      { name: "Nage Waza", current: 80, previous: 60 },
    ]);
    expect(result.recurringTechniques).toEqual([
      { name: "O-soto-gari", category: "Nage Waza", total: 120, count: 2 },
    ]);
  });

  it("combina filtros de modalidade, graduação e período", () => {
    const oldTechnical = evaluation("old", "2025-01-10 12:00:00", 70);
    const currentTechnical = evaluation("current", "2026-03-15 12:00:00", 80);
    const currentKata = evaluation("kata", "2026-03-20 12:00:00", 90, {
      type: "kata",
      belt: "Nage-no-Kata",
    });

    expect(filterStudentHistory(
      [currentKata, currentTechnical, oldTechnical],
      { type: "técnica", belt: "Cinza", dateFrom: "2026-01-01", dateTo: "2026-12-31" },
    ).map((item) => item.id)).toEqual(["current"]);
  });
});
