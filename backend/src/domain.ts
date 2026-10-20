import type {
  AuthUser,
  EvaluationInput,
  EvaluationRow,
  EvaluationType,
  StudentRow,
} from "./contracts";

export function normalizeEmail(value: string) {
  return value.trim().toLocaleLowerCase("pt-BR");
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
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

export function canDeleteEvaluation(user: AuthUser, row: EvaluationRow) {
  return user.role === "super_admin" || row.evaluator_id === user.id;
}

export function isEvaluation(value: unknown): value is EvaluationInput {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<EvaluationInput>;

  const validItems =
    item.items === undefined ||
    (Array.isArray(item.items) &&
      item.items.length <= 300 &&
      item.items.every(
        (entry) =>
          entry &&
          typeof entry.category === "string" &&
          entry.category.trim().length > 0 &&
          entry.category.trim().length <= 100 &&
          typeof entry.name === "string" &&
          entry.name.trim().length > 0 &&
          entry.name.trim().length <= 180 &&
          typeof entry.score === "number" &&
          entry.score >= 0 &&
          entry.score <= 100 &&
          (entry.detail === undefined ||
            (typeof entry.detail === "string" && entry.detail.length <= 500)),
      ));

  return Boolean(
    item.athlete?.trim() &&
      item.belt?.trim() &&
      (item.type === "teórica" ||
        item.type === "técnica" ||
        item.type === "kata") &&
      typeof item.score === "number" &&
      item.score >= 0 &&
      item.score <= 100 &&
      validItems,
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
    items: (row.items ?? [])
      .sort((left, right) => left.position - right.position)
      .map((item) => ({
        id: item.id,
        category: item.category,
        name: item.name,
        score: item.score,
        detail: item.detail,
      })),
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
  const catalog = Array.from(
    new Map(
      rows.map((row) => [
        row.student_id || normalizeName(row.athlete),
        {
          id: row.student_id || normalizeName(row.athlete),
          name: row.athlete,
          normalized_name: normalizeName(row.athlete),
          created_at: row.created_at,
        },
      ]),
    ).values(),
  );

  return studentsFromCatalog(catalog, rows);
}

export function studentsFromCatalog(
  catalog: StudentRow[],
  rows: EvaluationRow[],
) {
  const grouped = new Map<
    string,
    {
      id: string;
      name: string;
      evaluations: ReturnType<typeof formatEvaluation>[];
    }
  >();

  for (const student of catalog) {
    grouped.set(student.id, {
      id: student.id,
      name: student.name,
      evaluations: [],
    });
  }

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
        average: ordered.length
          ? Math.round(
              ordered.reduce((sum, item) => sum + item.score, 0) /
                ordered.length,
            )
          : 0,
        latestScore: last,
        evolution: ordered.length ? last - first : 0,
        lastEvaluationAt: ordered.at(-1)?.createdAt ?? null,
        evaluations: ordered,
      };
    })
    .sort(
      (a, b) =>
        new Date(b.lastEvaluationAt || 0).getTime() -
          new Date(a.lastEvaluationAt || 0).getTime() ||
        a.name.localeCompare(b.name, "pt-BR"),
    );
}
