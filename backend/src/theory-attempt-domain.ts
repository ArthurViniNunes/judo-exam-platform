export type TheoryScoreQuestion = {
  id: string;
  points: number;
  correctOptionId: string;
  correctGridAnswers?: Record<string, string[]> | null;
};

export type TheoryScoreAnswer = string | Record<string, string[]>;

export type TheoryScoreResult = {
  score: number;
  passed: boolean;
  awardedByQuestion: Record<string, number>;
};

function secureRandomIndex(maxExclusive: number) {
  if (!Number.isSafeInteger(maxExclusive) || maxExclusive <= 0) return 0;
  const range = 0x1_0000_0000;
  const limit = Math.floor(range / maxExclusive) * maxExclusive;
  const values = new Uint32Array(1);
  do crypto.getRandomValues(values); while (values[0] >= limit);
  return values[0] % maxExclusive;
}

export function shuffleTheoryItems<T>(
  items: readonly T[],
  randomIndex: (maxExclusive: number) => number = secureRandomIndex,
) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = randomIndex(index + 1);
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }
  return shuffled;
}

export function scoreTheoryAttempt(
  questions: TheoryScoreQuestion[],
  answers: Map<string, TheoryScoreAnswer>,
  minimumScore: number,
): TheoryScoreResult {
  const totalPoints = questions.reduce((sum, question) => sum + question.points, 0);
  const awardedByQuestion: Record<string, number> = {};
  let awardedPoints = 0;

  for (const question of questions) {
    const answer = answers.get(question.id);
    const gridCorrect = question.correctGridAnswers
      ? sameGridAnswers(
          typeof answer === "object" ? answer : {},
          question.correctGridAnswers,
        )
      : false;
    const awarded = (question.correctGridAnswers
      ? gridCorrect
      : answer === question.correctOptionId)
      ? question.points
      : 0;
    awardedByQuestion[question.id] = awarded;
    awardedPoints += awarded;
  }

  const score = totalPoints > 0
    ? Math.round((awardedPoints / totalPoints) * 100)
    : 0;
  return { score, passed: score >= minimumScore, awardedByQuestion };
}

export function sameGridAnswers(
  left: Record<string, string[]>,
  right: Record<string, string[]>,
) {
  const leftRows = Object.keys(left).sort();
  const rightRows = Object.keys(right).sort();
  if (leftRows.length !== rightRows.length) return false;
  return rightRows.every((rowId, index) => {
    if (leftRows[index] !== rowId) return false;
    const leftOptions = [...(left[rowId] ?? [])].sort();
    const rightOptions = [...(right[rowId] ?? [])].sort();
    return leftOptions.length === rightOptions.length &&
      leftOptions.every((optionId, optionIndex) => optionId === rightOptions[optionIndex]);
  });
}
