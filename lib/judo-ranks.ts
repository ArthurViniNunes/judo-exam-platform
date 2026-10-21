export const EVALUATOR_RANKS = [
  "Faixa branca",
  "Faixa cinza",
  "Faixa azul",
  "Faixa amarela",
  "Faixa laranja",
  "Faixa verde",
  "Faixa roxa",
  "Faixa marrom",
  "Faixa preta — 1º dan",
  "Faixa preta — 2º dan",
  "Faixa preta — 3º dan",
  "Faixa preta — 4º dan",
  "Faixa preta — 5º dan",
  "Faixa coral — 6º dan",
  "Faixa coral — 7º dan",
  "Faixa coral — 8º dan",
  "Faixa vermelha — 9º dan",
  "Faixa vermelha — 10º dan",
] as const;

export type EvaluatorRank = (typeof EVALUATOR_RANKS)[number];

export function isEvaluatorRank(value: unknown): value is EvaluatorRank {
  return (
    typeof value === "string" &&
    (EVALUATOR_RANKS as readonly string[]).includes(value)
  );
}
