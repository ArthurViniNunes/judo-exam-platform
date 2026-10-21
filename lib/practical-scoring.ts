import type { ExamCategory } from "./practical-exams";

export type PracticalResult = {
  score: number;
  approved: boolean;
  detail: string;
  categories: { name: string; score: number }[];
  items: {
    category: string;
    name: string;
    score: number;
    detail?: string;
    parts?: { name: string; score: number }[];
  }[];
};

export function calculatePracticalResult(
  exam: ExamCategory[],
  scores: Record<string, number>,
): PracticalResult {
  const categories = exam.map((category) => {
    const values = category.techniques.map((technique) => scores[technique.id]);
    const score = values.reduce((sum, value) => sum + value, 0) / values.length;
    return { name: category.name, score };
  });
  const values = Object.values(scores);
  const rawScore = values.reduce((sum, value) => sum + value, 0) / values.length;
  const belowSeven = categories.filter((category) => category.score < 7);
  const belowFive = categories.filter((category) => category.score < 5);
  const approved =
    rawScore >= 7 && belowSeven.length < 3 && belowFive.length < 2;
  const reasons: string[] = [];

  if (rawScore < 7) reasons.push("A nota geral ficou abaixo de 7,0.");
  if (belowSeven.length >= 3) {
    reasons.push(`${belowSeven.length} categorias ficaram abaixo de 7,0.`);
  }
  if (belowFive.length >= 2) {
    reasons.push(`${belowFive.length} categorias ficaram abaixo de 5,0.`);
  }

  return {
    score: Math.round(rawScore * 10) / 10,
    approved,
    categories,
    items: exam.flatMap((category) =>
      category.techniques.map((technique) => ({
        category: category.name,
        name: technique.name,
        score: scores[technique.id],
      })),
    ),
    detail: approved
      ? "O atleta atingiu os critérios de aprovação da avaliação prática."
      : reasons.join(" "),
  };
}
