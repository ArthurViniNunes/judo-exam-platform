import {
  THEORY_BELTS,
  type TheoryBeltId,
  type TheoryTemplateQuestion,
} from "../../lib/theory-exams";

import {
  BROWN_THEORY_QUESTIONS,
} from "./brown-theory-template";

import {
  PURPLE_THEORY_QUESTIONS,
} from "./purple-theory-template";

import {
  GREEN_THEORY_QUESTIONS,
} from "./green-theory-template";

import {
  ORANGE_THEORY_QUESTIONS,
} from "./orange-theory-template";


import {
  YELLOW_THEORY_QUESTIONS,
} from "./yellow-theory-template";

export type TheoryTemplate = {
  beltId: TheoryBeltId;
  beltName: string;
  minimumScore: number;
  questionOrder: "fixed" | "random";
  questions: TheoryTemplateQuestion[];
};

export type TheoryTemplateSummary = {
  questionCount: number;
  totalPoints: number;
  gridQuestionCount: number;
  pendingMediaCount: number;
};

const beltName = (beltId: TheoryBeltId) =>
  THEORY_BELTS.find((belt) => belt.id === beltId)?.name ?? beltId;

const MINIMUM_SCORE = 70;

export const THEORY_TEMPLATES: Partial<Record<TheoryBeltId, TheoryTemplate>> = {
  brown: {
    beltId: "brown",
    beltName: beltName("brown"),
    minimumScore: MINIMUM_SCORE,
    questionOrder: "random",
    questions: BROWN_THEORY_QUESTIONS,
  },
  purple: {
    beltId: "purple",
    beltName: beltName("purple"),
    minimumScore: MINIMUM_SCORE,
    questionOrder: "random",
    questions: PURPLE_THEORY_QUESTIONS,
  },
  green: {
    beltId: "green",
    beltName: beltName("green"),
    minimumScore: MINIMUM_SCORE,
    questionOrder: "random",
    questions: GREEN_THEORY_QUESTIONS,
  },
  orange: {
    beltId: "orange",
    beltName: beltName("orange"),
    minimumScore: MINIMUM_SCORE,
    questionOrder: "random",
    questions: ORANGE_THEORY_QUESTIONS,
  },
  yellow: {
    beltId: "yellow",
    beltName: beltName("yellow"),
    minimumScore: MINIMUM_SCORE,
    questionOrder: "random",
    questions: YELLOW_THEORY_QUESTIONS,
  },
};

export function summarizeTheoryTemplate(
  questions: TheoryTemplateQuestion[],
): TheoryTemplateSummary {
  return {
    questionCount: questions.length,
    totalPoints: questions.reduce((total, question) => total + question.points, 0),
    gridQuestionCount: questions.filter((question) => question.type !== "single_choice").length,
    pendingMediaCount: questions.filter((question) => question.mediaPending).length,
  };
}

export function getTheoryTemplate(beltId: string) {
  return THEORY_TEMPLATES[beltId as TheoryBeltId] ?? null;
}

export function listTheoryTemplateSummaries() {
  return Object.values(THEORY_TEMPLATES).map((template) => ({
    beltId: template.beltId,
    beltName: template.beltName,
    ...summarizeTheoryTemplate(template.questions),
  }));
}
