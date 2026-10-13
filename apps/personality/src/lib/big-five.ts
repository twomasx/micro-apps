import type { QuestionFile } from './questions.ts';
import type { AxisScore } from './scoring.ts';

export interface TraitScore {
  axis: string;
  /** "Openness to experience" */
  trait: string;
  /** How far the answers went toward the high end of the trait, 0 to 100. Not a percentile. */
  pct: number;
}

// The letter on each axis that goes with a higher score on its Big Five trait
// (McCrae and Costa, 1989). The axis files in content/ say the same in words.
const HIGH_POLE: Record<string, string> = { EI: 'E', SN: 'N', TF: 'F', JP: 'J' };

/** The four axis scores read as the Big Five traits they were measured with. */
export function bigFiveTraits(scores: readonly AxisScore[], questions: QuestionFile): TraitScore[] {
  const traits: TraitScore[] = [];
  for (const score of scores) {
    const axis = questions.axes.find((candidate) => candidate.id === score.axis);
    const high = HIGH_POLE[score.axis];
    if (!axis || high === undefined) continue;
    traits.push({
      axis: axis.id,
      trait: axis.bigFive,
      pct: high === axis.right.letter ? score.rightPct : score.leftPct,
    });
  }
  return traits;
}
