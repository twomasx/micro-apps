import { describe, expect, it } from 'vitest';
import { buildSequence, FONT_SCALES, sequenceSeconds, TRIAL_MS } from './sart-sequence';
import { seeded } from './testing';

function counts(digits: number[]): Map<number, number> {
  const map = new Map<number, number>();
  for (const digit of digits) map.set(digit, (map.get(digit) ?? 0) + 1);
  return map;
}

describe('SART sequence', () => {
  it.each([
    ['practice', 18, 2],
    ['quick', 108, 12],
    ['full', 225, 25],
  ] as const)('%s has %i digits, each digit %i times', (length, total, each) => {
    const sequence = buildSequence(length, seeded(3));
    expect(sequence).toHaveLength(total);
    const byDigit = counts(sequence.map((item) => item.digit));
    expect([...byDigit.keys()].sort()).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    for (const n of byDigit.values()) expect(n).toBe(each);
  });

  it('uses all five sizes', () => {
    const sizes = new Set(buildSequence('full', seeded(5)).map((item) => item.size));
    expect([...sizes].sort()).toEqual([0, 1, 2, 3, 4]);
    expect(FONT_SCALES).toHaveLength(5);
  });

  it('shuffles differently each time', () => {
    const a = buildSequence('quick', seeded(1)).map((item) => item.digit).join('');
    const b = buildSequence('quick', seeded(2)).map((item) => item.digit).join('');
    expect(a).not.toBe(b);
  });

  it('runs 250 ms plus 900 ms per digit', () => {
    expect(TRIAL_MS).toBe(1150);
    expect(sequenceSeconds('quick')).toBeCloseTo(124.2);
    expect(sequenceSeconds('full')).toBeCloseTo(258.75);
  });
});
