import type {
  AuthUser,
  EvaluationInput,
  EvaluationRow,
  EvaluationType,
  MatrixInput,
} from "./contracts";

export function normalizeEmail(value: string) {
  return value.trim().toLocaleLowerCase("pt-BR");
}

export function normalizeName(value: string) {
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/\s+/g, " ");
}

export function publicUser(user: AuthUser) {
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

export function isEvaluation(value: unknown): value is EvaluationInput {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<EvaluationInput>;

  return Boolean(
    item.athlete?.trim() &&
      item.belt?.trim() &&
      (item.type === "teórica" ||
        item.type === "técnica" ||
        item.type === "kata") &&
      typeof item.score === "number" &&
      item.score >= 0 &&
      item.score <= 100,
  );
}

export function isMatrix(value: unknown): value is MatrixInput {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<MatrixInput>;

  return Boolean(
    item.name?.trim() &&
      typeof item.hasKata === "boolean" &&
      Number.isFinite(item.minimumScore) &&
      item.minimumScore! >= 0 &&
      item.minimumScore! <= 10 &&
      Number.isInteger(item.maxCategoriesBelowFive) &&
      item.maxCategoriesBelowFive! >= 0 &&
      Array.isArray(item.categories) &&
      item.categories.length > 0 &&
      item.categories.every(
        (category) =>
          category.name?.trim() &&
          Array.isArray(category.techniques) &&
          category.techniques.some((technique) => technique.trim()),
      ) &&
      (!item.hasKata ||
        [
          "nage-no-kata-partial",
          "nage-no-kata-complete",
          "katame-no-kata",
        ].includes(item.kataType || "")),
  );
}

export function formatEvaluation(row: EvaluationRow) {
  return {
    id: row.id,
    athlete: row.athlete,
    studentId: row.student_id,
    evaluatorId: row.evaluator_id,
    evaluatorName: row.evaluator_name || row.professor || "Não informado",
    belt: row.belt,
    type: row.type,
    score: row.score,
    result: row.result,
    matrixId: row.matrix_id,
    detail: row.detail,
    createdAt: row.created_at,
  };
}

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function dashboardFromRows(rows: EvaluationRow[], now = new Date()) {
  const technicalRows = rows.filter((row) => row.type !== "kata");
  const approved = technicalRows.filter(
    (row) =>
      row.result?.toLocaleLowerCase("pt-BR").includes("aprov") ||
      (!row.result && row.score >= 70),
  ).length;
  const students = new Set(
    rows.map((row) => row.student_id || normalizeName(row.athlete)),
  );
  const months = Array.from({ length: 6 }, (_, offset) => {
    const date = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (5 - offset), 1),
    );

    return {
      key: monthKey(date),
      label: date
        .toLocaleDateString("pt-BR", { month: "short", timeZone: "UTC" })
        .replace(".", ""),
      count: 0,
      average: 0,
      total: 0,
    };
  });

  for (const row of rows) {
    const date = new Date(
      row.created_at.endsWith("Z") ? row.created_at : `${row.created_at}Z`,
    );
    const month = months.find((item) => item.key === monthKey(date));
    if (month) {
      month.count += 1;
      month.total += row.score;
      month.average = Math.round(month.total / month.count);
    }
  }

  const byType = (["técnica", "kata", "teórica"] as EvaluationType[]).map(
    (type) => {
      const matches = rows.filter((row) => row.type === type);
      const total = matches.reduce((sum, row) => sum + row.score, 0);
      return {
        type,
        count: matches.length,
        average: matches.length ? Math.round(total / matches.length) : 0,
      };
    },
  );

  const totalScore = rows.reduce((sum, row) => sum + row.score, 0);
  return {
    summary: {
      evaluations: rows.length,
      students: students.size,
      average: rows.length ? Math.round(totalScore / rows.length) : 0,
      approvalRate: technicalRows.length
        ? Math.round((approved / technicalRows.length) * 100)
        : 0,
    },
    months,
    byType,
    recent: rows.slice(0, 8).map(formatEvaluation),
  };
}

export function studentsFromRows(rows: EvaluationRow[]) {
  const grouped = new Map<
    string,
    {
      id: string;
      name: string;
      evaluations: ReturnType<typeof formatEvaluation>[];
    }
  >();

  for (const row of rows) {
    const id = row.student_id || normalizeName(row.athlete);
    const current = grouped.get(id) ?? {
      id,
      name: row.athlete,
      evaluations: [],
    };
    current.evaluations.push(formatEvaluation(row));
    grouped.set(id, current);
  }

  return Array.from(grouped.values())
    .map((student) => {
      const ordered = [...student.evaluations].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
      const first = ordered[0]?.score ?? 0;
      const last = ordered.at(-1)?.score ?? 0;
      return {
        ...student,
        average: Math.round(
          ordered.reduce((sum, item) => sum + item.score, 0) / ordered.length,
        ),
        latestScore: last,
        evolution: last - first,
        lastEvaluationAt: ordered.at(-1)?.createdAt,
        evaluations: ordered,
      };
    })
    .sort(
      (a, b) =>
        new Date(b.lastEvaluationAt || 0).getTime() -
        new Date(a.lastEvaluationAt || 0).getTime(),
    );
}
