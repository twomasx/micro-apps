import { describe, expect, it } from 'vitest';
import { currentQuestions as questions } from './questions.ts';
import { describeAxes } from './result-view.ts';
import type { AxisScore } from './scoring.ts';

function axisScore(axis: string, letter: string, rightPct: number, balanced = false): AxisScore {
  return { axis, letter, leftPct: 100 - rightPct, rightPct, balanced };
}

describe('describeAxes', () => {
  it('shows the winning side as a whole number with its name', () => {
    const [view] = describeAxes([axisScore('EI', 'I', 67.5)], questions);
    expect(view?.headline).toBe('68% Introversion');
    expect(view?.balanceLabel).toBeNull();
    expect(view?.plain).toBe('energized by quiet and time alone');
    expect(view?.right).toEqual({ letter: 'I', name: 'Introversion', pct: 68, winner: true });
    expect(view?.left).toEqual({ letter: 'E', name: 'Extraversion', pct: 32, winner: false });
  });

  it('works for a left-side winner', () => {
    const [view] = describeAxes([axisScore('TF', 'T', 22.5)], questions);
    expect(view?.headline).toBe('78% Thinking');
    expect(view?.left.winner).toBe(true);
    expect((view?.left.pct ?? 0) + (view?.right.pct ?? 0)).toBe(100);
  });

  it('labels a balanced axis and still names the letter', () => {
    const [view] = describeAxes([axisScore('SN', 'N', 52.5, true)], questions);
    expect(view?.headline).toBe('53% Intuition');
    expect(view?.balanceLabel).toBe('balanced, leans N');
  });

  it('handles an exact tie that leans left', () => {
    const [view] = describeAxes([axisScore('JP', 'J', 50, true)], questions);
    expect(view?.headline).toBe('50% Judging');
    expect(view?.balanceLabel).toBe('balanced, leans J');
    expect(view?.left.pct).toBe(50);
    expect(view?.right.pct).toBe(50);
  });

  it('keeps the axes in the order of the scores', () => {
    const views = describeAxes(
      [axisScore('EI', 'E', 10), axisScore('SN', 'S', 10), axisScore('TF', 'T', 10), axisScore('JP', 'J', 10)],
      questions,
    );
    expect(views.map((view) => view.letter).join('')).toBe('ESTJ');
  });
});
