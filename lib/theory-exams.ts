export const THEORY_BELTS = [
  { id: "gray", name: "Faixa cinza — 7º Kyu" },
  { id: "blue", name: "Faixa azul — 6º Kyu" },
  { id: "yellow", name: "Faixa amarela — 5º Kyu" },
  { id: "orange", name: "Faixa laranja — 4º Kyu" },
  { id: "green", name: "Faixa verde — 3º Kyu" },
  { id: "purple", name: "Faixa roxa — 2º Kyu" },
  { id: "brown", name: "Faixa marrom — 1º Kyu" },
] as const;

export type TheoryBeltId = (typeof THEORY_BELTS)[number]["id"];
export type TheoryExamStatus = "draft" | "published" | "closed";
export type TheoryQuestionOrder = "fixed" | "random";
export type TheoryMediaKind = "image" | "audio" | "video" | "youtube";

export const THEORY_CATEGORIES = [
  "História",
  "Filosofia",
  "Etiqueta",
  "Terminologia",
  "Arbitragem",
  "Técnicas",
] as const;

export type TheoryQuestionOption = {
  id: string;
  text: string;
  isCorrect: boolean;
  position: number;
};

export type TheoryQuestionMedia = {
  id: string;
  kind: TheoryMediaKind;
  sourceUrl: string;
  altText: string;
  metadataSensitive: boolean;
};

export type TheoryQuestion = {
  id: string;
  category: string;
  prompt: string;
  points: number;
  explanation: string;
  position: number;
  options: TheoryQuestionOption[];
  media: TheoryQuestionMedia | null;
};

export type TheoryExamVersionSummary = {
  id: string;
  beltId: TheoryBeltId;
  beltName: string;
  versionNumber: number;
  minimumScore: number | null;
  questionOrder: TheoryQuestionOrder | null;
  status: TheoryExamStatus;
  questionCount: number;
  totalPoints: number;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  closedAt: string | null;
};

export type TheoryExamVersion = TheoryExamVersionSummary & {
  questions: TheoryQuestion[];
};
