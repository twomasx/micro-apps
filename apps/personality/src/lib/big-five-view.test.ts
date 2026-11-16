import { describe, expect, it } from 'vitest';
import { ALIKE_WITHIN, compareTraits, swapTraitSides, type BigFiveCompareResponse } from './big-five-view.ts';
import { bigFiveQuestions } from './big-five-test.ts';

const scores = (values: number[]) => bigFiveQuestions.axes.map((trait, n) => ({ trait: trait.id, pct: values[n]! }));

describe('compareTraits', () => {
  it('lines up the five traits in order, with the gap and whether they are alike', () => {
    const result = compareTraits(scores([80, 50, 20, 60, 40]), scores([70, 50, 60, 60, 90]), bigFiveQuestions.axes);
    expect(result.traits.map((pair) => [pair.trait, pair.difference, pair.alike])).toEqual([
      ['O', 10, true],
      ['C', 0, true],
      ['E', 40, false],
      ['A', 0, true],
      ['N', 50, false],
    ]);
    expect(result.similarity).toBe(80);
  });

  it(`counts a gap of ${ALIKE_WITHIN} points as alike and more as different`, () => {
    const [pair] = compareTraits(scores([50, 0, 0, 0, 0]), scores([50 + ALIKE_WITHIN, 0, 0, 0, 0]), bigFiveQuestions.axes).traits;
    expect(pair?.alike).toBe(true);
    const [apart] = compareTraits(scores([50, 0, 0, 0, 0]), scores([51.25 + ALIKE_WITHIN, 0, 0, 0, 0]), bigFiveQuestions.axes).traits;
    expect(apart?.alike).toBe(false);
  });

  it('swapping sides twice gives the same comparison back', () => {
    const compare: BigFiveCompareResponse = {
      kind: 'big-five',
      ...compareTraits(scores([80, 50, 20, 60, 40]), scores([70, 50, 60, 60, 90]), bigFiveQuestions.axes),
      a: { id: 'a' },
      b: { id: 'b' },
      unlocked: false,
      couple: null,
    };
    const swapped = swapTraitSides(compare);
    expect(swapped.a.id).toBe('b');
    expect(swapped.traits[2]).toMatchObject({ a: 60, b: 20 });
    expect(swapTraitSides(swapped)).toEqual(compare);
  });
});
