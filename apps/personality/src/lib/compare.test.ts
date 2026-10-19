import { describe, expect, it } from 'vitest';
import { bulletLines, compareScores, swapSides, type CompareResponse } from './compare.ts';
import { currentQuestions } from './questions.ts';
import type { AxisScore } from './scoring.ts';

function scores(rights: [number, number, number, number]): AxisScore[] {
  return currentQuestions.axes.map((axis, position) => {
    const rightPct = rights[position] ?? 50;
    return {
      axis: axis.id,
      letter: rightPct > 50 ? axis.right.letter : axis.left.letter,
      leftPct: 100 - rightPct,
      rightPct,
      balanced: Math.abs(rightPct - 50) <= 5,
    };
  });
}

describe('compareScores', () => {
  it('says alike or different per axis and how far apart', () => {
    const { axes } = compareScores(scores([75, 60, 20, 40]), scores([55, 30, 20, 90]), currentQuestions);
    expect(axes.map((axis) => [axis.axis, axis.alike, axis.difference])).toEqual([
      ['EI', true, 20],
      ['SN', false, 30],
      ['TF', true, 0],
      ['JP', false, 50],
    ]);
    expect(axes[1]?.a.headline).toBe('60% Intuition');
    expect(axes[1]?.b.headline).toBe('70% Sensing');
    expect([axes[1]?.aRightPct, axes[1]?.bRightPct]).toEqual([60, 30]);
  });

  it('similarity is 100 minus the average gap', () => {
    const one = scores([75, 60, 20, 40]);
    expect(compareScores(one, scores([55, 30, 20, 90]), currentQuestions).similarity).toBe(75);
    expect(compareScores(one, one, currentQuestions).similarity).toBe(100);
    expect(compareScores(scores([0, 0, 0, 0]), scores([100, 100, 100, 100]), currentQuestions).similarity).toBe(0);
  });
});

describe('swapSides', () => {
  it('swaps the two results everywhere', () => {
    const compare: CompareResponse = {
      ...compareScores(scores([75, 60, 20, 40]), scores([55, 30, 20, 90]), currentQuestions),
      a: { id: 'a', type: 'INTJ', reportUnlocked: true },
      b: { id: 'b', type: 'ISTP', reportUnlocked: false },
      unlocked: false,
      revoked: false,
      couple: null,
    };
    const swapped = swapSides(compare);
    expect(swapped.a.id).toBe('b');
    expect(swapped.axes[1]?.a.headline).toBe('70% Sensing');
    expect(swapped.axes[1]?.aRightPct).toBe(30);
    expect(swapped.similarity).toBe(75);
    expect(swapSides(swapped)).toEqual(compare);
  });
});

describe('bulletLines', () => {
  it('reads the list items', () => {
    expect(bulletLines('- First?\n- Second?\n\nNot a bullet')).toEqual(['First?', 'Second?']);
  });
});
