import { describe, expect, it } from 'vitest';
import { bigFiveTraits } from './big-five.ts';
import { currentQuestions } from './questions.ts';
import type { AxisScore } from './scoring.ts';

describe('bigFiveTraits', () => {
  it('reads E, N, F and J as the high end of their traits', () => {
    const scores: AxisScore[] = [
      { axis: 'EI', letter: 'I', leftPct: 32.5, rightPct: 67.5, balanced: false },
      { axis: 'SN', letter: 'N', leftPct: 47.5, rightPct: 52.5, balanced: true },
      { axis: 'TF', letter: 'T', leftPct: 80, rightPct: 20, balanced: false },
      { axis: 'JP', letter: 'J', leftPct: 60, rightPct: 40, balanced: false },
    ];
    expect(bigFiveTraits(scores, currentQuestions)).toEqual([
      { axis: 'EI', trait: 'Extraversion', pct: 32.5 },
      { axis: 'SN', trait: 'Openness to experience', pct: 52.5 },
      { axis: 'TF', trait: 'Agreeableness', pct: 20 },
      { axis: 'JP', trait: 'Conscientiousness', pct: 60 },
    ]);
  });
});
