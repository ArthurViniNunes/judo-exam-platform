import type { EvaluationRecord } from "./platform";

export type CategoryComparison = {
  name: string;
  current: number;
  previous: number | undefined;
};

export type RecurringTechnique = {
  name: string;
  category: string;
  total: number;
  count: number;
};

export type StudentHistoryFilters = {
  type: string;
  belt: string;
  dateFrom: string;
  dateTo: string;
};

export function evaluationSeriesKey(evaluation: EvaluationRecord) {
  return [
    evaluation.type,
    evaluation.belt,
    evaluation.matrixId || "catalogo-fixo",
  ].join("::");
}

export function evaluationSeriesLabel(evaluation: EvaluationRecord) {
  const matrix = evaluation.matrixId ? "matriz personalizada" : "catálogo fixo";
  return `${evaluation.type} · ${evaluation.belt} · ${matrix}`;
}

export function chronologicalEvaluations(evaluations: EvaluationRecord[]) {
  return [...evaluations].sort(
    (left, right) =>
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  );
}

export function latestComparableTrend(evaluations: EvaluationRecord[]) {
  const ordered = chronologicalEvaluations(evaluations);
  const latest = ordered.at(-1);
  if (!latest) return { score: 0, difference: null as number | null };

  const latestKey = evaluationSeriesKey(latest);
  const previous = ordered
    .slice(0, -1)
    .reverse()
    .find((evaluation) => evaluationSeriesKey(evaluation) === latestKey);

  return {
    score: latest.score,
    difference: previous ? latest.score - previous.score : null,
  };
}

function evaluationDateKey(createdAt: string) {
  const normalized = createdAt.endsWith("Z") ? createdAt : `${createdAt}Z`;
  const timestamp = new Date(normalized);
  return Number.isNaN(timestamp.getTime()) ? createdAt.slice(0, 10) : timestamp.toISOString().slice(0, 10);
}

export function filterStudentHistory(
  evaluations: EvaluationRecord[],
  filters: StudentHistoryFilters,
) {
  return chronologicalEvaluations(evaluations).filter((evaluation) => {
    const date = evaluationDateKey(evaluation.createdAt);
    return (
      (!filters.type || evaluation.type === filters.type) &&
      (!filters.belt || evaluation.belt === filters.belt) &&
      (!filters.dateFrom || date >= filters.dateFrom) &&
      (!filters.dateTo || date <= filters.dateTo)
    );
  });
}

export function buildStudentEvolution(
  evaluations: EvaluationRecord[],
  requestedSeriesKey: string,
) {
  const ordered = chronologicalEvaluations(evaluations);
  const options = ordered.reduce<{ key: string; label: string }[]>(
    (series, evaluation) => {
      const key = evaluationSeriesKey(evaluation);
      if (!series.some((option) => option.key === key)) {
        series.push({ key, label: evaluationSeriesLabel(evaluation) });
      }
      return series;
    },
    [],
  );
  const defaultKey = ordered.length
    ? evaluationSeriesKey(ordered[ordered.length - 1])
    : "";
  const activeKey = options.some((option) => option.key === requestedSeriesKey)
    ? requestedSeriesKey
    : defaultKey;
  const series = ordered.filter(
    (evaluation) => evaluationSeriesKey(evaluation) === activeKey,
  );
  const latest = series.at(-1);
  const previous = series.at(-2);
  const previousCategories = new Map(
    (previous?.categories ?? []).map((category) => [category.name, category.score]),
  );
  const categories: CategoryComparison[] = (latest?.categories ?? []).map(
    (category) => ({
      name: category.name,
      current: category.score,
      previous: previousCategories.get(category.name),
    }),
  );
  const recurringTechniques: RecurringTechnique[] = [
    ...series
      .flatMap((evaluation) => evaluation.items)
      .reduce<Map<string, RecurringTechnique>>((techniques, item) => {
        const key = `${item.category}::${item.name}`;
        const current = techniques.get(key) ?? {
          name: item.name,
          category: item.category,
          total: 0,
          count: 0,
        };
        current.total += item.score;
        current.count += 1;
        techniques.set(key, current);
        return techniques;
      }, new Map())
      .values(),
  ]
    .filter((technique) => technique.count >= 2 && technique.total / technique.count < 70)
    .sort(
      (left, right) =>
        left.total / left.count - right.total / right.count ||
        right.count - left.count,
    )
    .slice(0, 5);

  return {
    options,
    activeKey,
    series,
    latest,
    previous,
    overallDifference: latest && previous ? latest.score - previous.score : 0,
    categories,
    recurringTechniques,
  };
}
