// Scoring for the personality test. Pure TypeScript with no DOM or Workers APIs,
// so the client and the Pages Functions import the same module.

export interface PoleDefinition {
  letter: string;
  name: string;
}

export interface AxisDefinition {
  id: string;
  left: PoleDefinition;
  right: PoleDefinition;
}

export interface ItemDefinition {
  id: string;
  axis: string;
  pole: string;
}

export interface TestDefinition {
  version: string;
  axes: readonly AxisDefinition[];
  items: readonly ItemDefinition[];
}

/** Item id to answer value (1 to 5). */
export type Answers = Readonly<Record<string, number>>;

export type Flag = 'same_answers';

export interface AxisScore {
  axis: string;
  letter: string;
  /** Unrounded. leftPct + rightPct is always 100. */
  leftPct: number;
  rightPct: number;
  balanced: boolean;
}

export interface ScoreResult {
  version: string;
  type: string;
  scores: AxisScore[];
  flags: Flag[];
}

export const MIN_ANSWER = 1;
export const MAX_ANSWER = 5;
export const BALANCED_MAX_PCT = 55;

export class ScoringError extends Error {
  override name = 'ScoringError';
}

function readAnswer(answers: Answers, itemId: string): number {
  if (!Object.hasOwn(answers, itemId)) {
    throw new ScoringError(`Missing answer for ${itemId}`);
  }
  const value: unknown = answers[itemId];
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < MIN_ANSWER ||
    value > MAX_ANSWER
  ) {
    throw new ScoringError(
      `Answer for ${itemId} must be a whole number from ${MIN_ANSWER} to ${MAX_ANSWER}`,
    );
  }
  return value;
}

function scoreAxis(
  axis: AxisDefinition,
  items: readonly ItemDefinition[],
  answers: Answers,
): AxisScore {
  if (items.length === 0) {
    throw new ScoringError(`Axis ${axis.id} has no questions`);
  }

  let total = 0;
  let leftAgrees = 0;
  let rightAgrees = 0;
  for (const item of items) {
    const value = readAnswer(answers, item.id);
    const agrees = value >= 4;
    if (item.pole === axis.right.letter) {
      total += value;
      if (agrees) rightAgrees += 1;
    } else if (item.pole === axis.left.letter) {
      total += MIN_ANSWER + MAX_ANSWER - value;
      if (agrees) leftAgrees += 1;
    } else {
      throw new ScoringError(`Question ${item.id} has pole ${item.pole}, not on axis ${axis.id}`);
    }
  }

  // Multiply before dividing so the 2.5-point steps stay exact (0.55 * 100 is not 55).
  const min = items.length * MIN_ANSWER;
  const max = items.length * MAX_ANSWER;
  const rightPct = ((total - min) * 100) / (max - min);
  const leftPct = 100 - rightPct;

  let rightWins: boolean;
  if (rightPct !== leftPct) {
    rightWins = rightPct > leftPct;
  } else {
    // Tie: the pole with more of its own questions answered 4 or 5. Still tied: left.
    rightWins = rightAgrees > leftAgrees;
  }

  return {
    axis: axis.id,
    letter: rightWins ? axis.right.letter : axis.left.letter,
    leftPct,
    rightPct,
    balanced: Math.max(leftPct, rightPct) <= BALANCED_MAX_PCT,
  };
}

/** Scores a full set of answers. Throws ScoringError if any answer is missing or invalid. */
export function score(test: TestDefinition, answers: Answers): ScoreResult {
  const itemIds = new Set(test.items.map((item) => item.id));
  for (const key of Object.keys(answers)) {
    if (!itemIds.has(key)) {
      throw new ScoringError(`Unknown question ${key}`);
    }
  }

  const scores = test.axes.map((axis) =>
    scoreAxis(
      axis,
      test.items.filter((item) => item.axis === axis.id),
      answers,
    ),
  );

  const values = new Set(test.items.map((item) => readAnswer(answers, item.id)));
  const flags: Flag[] = values.size === 1 ? ['same_answers'] : [];

  return {
    version: test.version,
    type: scores.map((axisScore) => axisScore.letter).join(''),
    scores,
    flags,
  };
}

/** The winning side as a whole number, for display: "68% Introversion". */
export function winningPct(axisScore: AxisScore): number {
  return Math.round(Math.max(axisScore.leftPct, axisScore.rightPct));
}
