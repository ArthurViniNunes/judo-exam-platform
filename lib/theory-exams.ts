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

export type StudentTheoryMedia = {
  kind: TheoryMediaKind;
  sourceUrl: string;
  altText: string;
};

export type StudentTheoryOption = {
  id: string;
  text: string;
};

export type StudentTheoryAttemptQuestion = {
  id: string;
  category: string;
  prompt: string;
  points: number;
  position: number;
  options: StudentTheoryOption[];
  media: StudentTheoryMedia | null;
  selectedOptionId: string | null;
};

export type StudentTheoryAttempt = {
  id: string;
  status: "in_progress" | "submitted";
  beltId: string;
  beltName: string;
  minimumScore: number;
  startedAt: string;
  updatedAt: string;
  questions: StudentTheoryAttemptQuestion[];
  answeredCount: number;
};

export type StudentTheoryResultQuestion = StudentTheoryAttemptQuestion & {
  explanation: string;
  correctOptionId: string;
  awardedPoints: number;
  correct: boolean;
};

export type StudentTheoryResult = {
  id: string;
  beltId: string;
  beltName: string;
  score: number;
  minimumScore: number;
  passed: boolean;
  startedAt: string;
  submittedAt: string;
  questions: StudentTheoryResultQuestion[];
};

export type StudentTheoryAvailability =
  | { status: "needs_target_belt" }
  | { status: "unavailable"; beltId: string; beltName: string }
  | {
      status: "available";
      exam: {
        beltId: string;
        beltName: string;
        versionNumber: number;
        minimumScore: number;
        questionCount: number;
        totalPoints: number;
      };
    }
  | { status: "in_progress"; attempt: StudentTheoryAttempt | null }
  | {
      status: "eligible";
      beltId: string;
      beltName: string;
      validFrom: string;
      latestAttemptId: string | null;
    };

export function toTheoryYouTubeEmbedUrl(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    let videoId = "";
    if (host === "youtu.be") videoId = parsed.pathname.slice(1).split("/")[0];
    if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
      if (parsed.pathname === "/watch") videoId = parsed.searchParams.get("v") || "";
      else if (parsed.pathname.startsWith("/embed/") || parsed.pathname.startsWith("/shorts/")) {
        videoId = parsed.pathname.split("/")[2] || "";
      }
    }
    if (!/^[A-Za-z0-9_-]{6,}$/.test(videoId)) return null;
    return `https://www.youtube-nocookie.com/embed/${videoId}?playsinline=1&rel=0`;
  } catch {
    return null;
  }
}
