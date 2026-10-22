import {
  THEORY_BELTS,
  type TheoryBeltId,
  type TheoryMediaKind,
  type TheoryQuestionType,
  type TheoryQuestionOrder,
} from "../../lib/theory-exams";

export type TheoryVersionInput = {
  beltId: TheoryBeltId;
  beltName: string;
  minimumScore: number | null;
  questionOrder: TheoryQuestionOrder | null;
};

export type TheoryQuestionInput = {
  type: TheoryQuestionType;
  category: string;
  prompt: string;
  points: number;
  explanation: string;
  options: { text: string; isCorrect: boolean }[];
  rows: { text: string; correctOptionIndexes: number[] }[];
  media: {
    kind: TheoryMediaKind;
    sourceUrl: string;
    altText: string;
    metadataSensitive: boolean;
  } | null;
};

export type TheoryPublicationQuestion = {
  type: TheoryQuestionType;
  explanation: string;
  optionCount: number;
  correctOptionCount: number;
  rowCount: number;
  invalidRowCount: number;
  mediaKind: TheoryMediaKind | null;
  metadataSensitive: boolean;
};

const mediaKinds = new Set<TheoryMediaKind>([
  "image",
  "audio",
  "video",
  "youtube",
]);

const questionTypes = new Set<TheoryQuestionType>([
  "single_choice",
  "grid_single",
  "grid_multiple",
]);

export function theoryBelt(beltId: unknown) {
  return THEORY_BELTS.find((belt) => belt.id === beltId) ?? null;
}

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function validHttpsUrl(value: string) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function isYouTubeUrl(value: string) {
  try {
    const host = new URL(value).hostname.toLowerCase().replace(/^www\./, "");
    return [
      "youtube.com",
      "m.youtube.com",
      "youtube-nocookie.com",
      "youtu.be",
    ].includes(host);
  } catch {
    return false;
  }
}

export function validateTheoryVersionInput(
  value: unknown,
): TheoryVersionInput | string {
  if (!value || typeof value !== "object") {
    return "Informe os dados da versão da prova.";
  }
  const candidate = value as Record<string, unknown>;
  const belt = theoryBelt(candidate.beltId);
  if (!belt) return "Selecione uma graduação válida.";

  const minimumScore = candidate.minimumScore;
  if (
    minimumScore !== null &&
    minimumScore !== undefined &&
    (!Number.isInteger(minimumScore) || Number(minimumScore) < 0 || Number(minimumScore) > 100)
  ) {
    return "A nota mínima deve ser um número inteiro entre 0 e 100.";
  }

  const questionOrder = candidate.questionOrder;
  if (
    questionOrder !== null &&
    questionOrder !== undefined &&
    questionOrder !== "fixed" &&
    questionOrder !== "random"
  ) {
    return "Escolha ordem fixa ou aleatória para as questões.";
  }

  return {
    beltId: belt.id,
    beltName: belt.name,
    minimumScore:
      minimumScore === null || minimumScore === undefined
        ? null
        : Number(minimumScore),
    questionOrder:
      questionOrder === "fixed" || questionOrder === "random"
        ? questionOrder
        : null,
  };
}

export function validateTheoryQuestionInput(
  value: unknown,
): TheoryQuestionInput | string {
  if (!value || typeof value !== "object") {
    return "Informe os dados da questão.";
  }
  const candidate = value as Record<string, unknown>;
  const type = questionTypes.has(candidate.type as TheoryQuestionType)
    ? candidate.type as TheoryQuestionType
    : "single_choice";
  const category = cleanText(candidate.category);
  const prompt = cleanText(candidate.prompt);
  const explanation = cleanText(candidate.explanation);
  const points = Number(candidate.points);
  if (category.length < 2 || category.length > 60) {
    return "Informe uma categoria entre 2 e 60 caracteres.";
  }
  if (prompt.length < 5 || prompt.length > 3000) {
    return "O enunciado deve ter entre 5 e 3.000 caracteres.";
  }
  if (!Number.isInteger(points) || points < 1 || points > 100) {
    return "A pontuação deve ser um número inteiro entre 1 e 100.";
  }
  if (explanation.length > 1000) {
    return "A explicação deve ter no máximo 1.000 caracteres.";
  }

  const maximumOptions = type === "single_choice" ? 6 : 12;
  if (!Array.isArray(candidate.options) || candidate.options.length < 2 || candidate.options.length > maximumOptions) {
    return `Cadastre entre 2 e ${maximumOptions} alternativas.`;
  }
  const options = candidate.options.map((option) => {
    const item = option && typeof option === "object"
      ? option as Record<string, unknown>
      : {};
    return { text: cleanText(item.text), isCorrect: item.isCorrect === true };
  });
  if (options.some((option) => option.text.length < 1 || option.text.length > 300)) {
    return "Cada alternativa deve ter entre 1 e 300 caracteres.";
  }
  if (new Set(options.map((option) => option.text.toLocaleLowerCase("pt-BR"))).size !== options.length) {
    return "As alternativas não podem se repetir.";
  }
  if (type === "single_choice" && options.filter((option) => option.isCorrect).length !== 1) {
    return "Marque exatamente uma alternativa correta.";
  }

  const rows = type === "single_choice"
    ? []
    : Array.isArray(candidate.rows)
      ? candidate.rows.map((row) => {
          const item = row && typeof row === "object" ? row as Record<string, unknown> : {};
          const indexes = Array.isArray(item.correctOptionIndexes)
            ? [...new Set(item.correctOptionIndexes.filter(Number.isInteger).map(Number))]
            : [];
          return { text: cleanText(item.text), correctOptionIndexes: indexes };
        })
      : [];
  if (type !== "single_choice" && (rows.length < 1 || rows.length > 20)) {
    return "Cadastre entre 1 e 20 itens para relacionar.";
  }
  if (rows.some((row) => row.text.length < 1 || row.text.length > 300)) {
    return "Cada item da grade deve ter entre 1 e 300 caracteres.";
  }
  if (new Set(rows.map((row) => row.text.toLocaleLowerCase("pt-BR"))).size !== rows.length) {
    return "Os itens da grade não podem se repetir.";
  }
  if (rows.some((row) => row.correctOptionIndexes.some((index) => index < 0 || index >= options.length))) {
    return "A grade contém uma resposta que não existe.";
  }
  if (type === "grid_single" && rows.some((row) => row.correctOptionIndexes.length !== 1)) {
    return "Marque exatamente uma resposta correta para cada item da grade.";
  }
  if (type === "grid_multiple" && rows.some((row) => row.correctOptionIndexes.length < 1)) {
    return "Marque ao menos uma resposta correta para cada item da grade.";
  }

  let media: TheoryQuestionInput["media"] = null;
  if (candidate.media !== null && candidate.media !== undefined) {
    if (typeof candidate.media !== "object") return "Informe uma mídia válida.";
    const mediaCandidate = candidate.media as Record<string, unknown>;
    const kind = mediaCandidate.kind;
    const sourceUrl = cleanText(mediaCandidate.sourceUrl);
    const altText = cleanText(mediaCandidate.altText);
    const metadataSensitive = mediaCandidate.metadataSensitive === true;
    if (!mediaKinds.has(kind as TheoryMediaKind)) return "Selecione um tipo de mídia válido.";
    if (!validHttpsUrl(sourceUrl)) return "A mídia precisa usar uma URL HTTPS válida.";
    if (kind === "youtube" && !isYouTubeUrl(sourceUrl)) {
      return "Use um link válido do YouTube para este tipo de mídia.";
    }
    if (kind === "youtube" && metadataSensitive) {
      return "Vídeos do YouTube não podem ser usados quando o metadado revela a resposta.";
    }
    if (altText.length > 200) return "A descrição acessível deve ter no máximo 200 caracteres.";
    media = {
      kind: kind as TheoryMediaKind,
      sourceUrl,
      altText,
      metadataSensitive,
    };
  }

  return { type, category, prompt, points, explanation, options, rows, media };
}

export function validateTheoryPublication(
  version: { minimumScore: number | null; questionOrder: TheoryQuestionOrder | null },
  questions: TheoryPublicationQuestion[],
) {
  const errors: string[] = [];
  if (version.minimumScore === null) errors.push("Defina a nota mínima.");
  if (version.questionOrder === null) errors.push("Defina a ordem das questões.");
  if (questions.length === 0) errors.push("Cadastre pelo menos uma questão.");
  questions.forEach((question, index) => {
    const label = `Questão ${index + 1}`;
    if (!question.explanation.trim()) errors.push(`${label}: informe a explicação do gabarito.`);
    if (question.optionCount < 2) errors.push(`${label}: cadastre pelo menos duas alternativas.`);
    if (question.type === "single_choice" && question.correctOptionCount !== 1) {
      errors.push(`${label}: marque exatamente uma resposta correta.`);
    }
    if (question.type !== "single_choice" && question.rowCount < 1) {
      errors.push(`${label}: cadastre ao menos um item para relacionar.`);
    }
    if (question.type !== "single_choice" && question.invalidRowCount > 0) {
      errors.push(`${label}: complete o gabarito de todos os itens da grade.`);
    }
    if (question.mediaKind === "youtube" && question.metadataSensitive) {
      errors.push(`${label}: substitua o YouTube por uma mídia própria sanitizada.`);
    }
  });
  return errors;
}
