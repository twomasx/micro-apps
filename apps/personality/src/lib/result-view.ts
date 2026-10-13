import type { QuestionFile } from './questions.ts';
import { winningPct, type AxisScore } from './scoring.ts';

export interface SideView {
  letter: string;
  name: string;
  /** Whole number. The two sides of an axis always add up to 100. */
  pct: number;
  winner: boolean;
}

export interface AxisView {
  axis: string;
  letter: string;
  balanced: boolean;
  /** "68% Introversion" */
  headline: string;
  /** "balanced, leans I", or null when the axis is not balanced. */
  balanceLabel: string | null;
  /** The winning side in plain words: "energized by quiet and time alone". */
  plain: string;
  left: SideView;
  right: SideView;
}

/** Turns stored scores into the words and whole numbers the result page shows. */
export function describeAxes(scores: readonly AxisScore[], questions: QuestionFile): AxisView[] {
  const views: AxisView[] = [];
  for (const axisScore of scores) {
    const axis = questions.axes.find((candidate) => candidate.id === axisScore.axis);
    if (!axis) continue;

    const rightWins = axisScore.letter === axis.right.letter;
    const winner = rightWins ? axis.right : axis.left;
    const pct = winningPct(axisScore);
    views.push({
      axis: axis.id,
      letter: axisScore.letter,
      balanced: axisScore.balanced,
      headline: `${pct}% ${winner.name}`,
      balanceLabel: axisScore.balanced ? `balanced, leans ${axisScore.letter}` : null,
      plain: winner.plain,
      left: {
        letter: axis.left.letter,
        name: axis.left.name,
        pct: rightWins ? 100 - pct : pct,
        winner: !rightWins,
      },
      right: {
        letter: axis.right.letter,
        name: axis.right.name,
        pct: rightWins ? pct : 100 - pct,
        winner: rightWins,
      },
    });
  }
  return views;
}

export const SAME_ANSWERS_MESSAGE =
  'You gave the same answer to every question, so this result may not describe you.';

export const COMPARE_WARNING = 'The person you send this to will see your result.';
