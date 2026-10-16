import { describe, expect, it } from 'vitest';
import { formatZ, runVerdict, totalVerdict } from './copy.ts';
import { aimSign, deviationOf, erfc, liveZ, oneIn, runZ, stouffer, stoufferFromSum, upperTail } from './scoring.ts';

describe('z scores', () => {
  it('counts 1s as +1 and 0s as −1', () => {
    expect(deviationOf([1, 1, 1, 0])).toBe(2);
    expect(deviationOf([0, 0, 0, 0, 1])).toBe(-3);
    expect(deviationOf([])).toBe(0);
  });

  it('1 bits favor the right-hand color', () => {
    expect(aimSign('right')).toBe(1);
    expect(aimSign('left')).toBe(-1);
  });

  it('scores toward the aim over the planned length', () => {
    // 4,000 bits with 2,020 ones: deviation +40. √4000 = 63.2456.
    expect(runZ(40, 'right', 4000)).toBeCloseTo(0.632456, 6);
    expect(runZ(40, 'left', 4000)).toBeCloseTo(-0.632456, 6);
    expect(runZ(-126, 'left', 4000)).toBeCloseTo(1.992235, 6);
    // Stopped after 1,000 of 4,000 bits with deviation +40: still divided by √4000.
    expect(runZ(40, 'right', 4000)).not.toBeCloseTo(liveZ(40, 'right', 1000), 3);
    expect(liveZ(40, 'right', 1000)).toBeCloseTo(1.264911, 6);
    expect(liveZ(0, 'right', 0)).toBe(0);
  });
});

describe('one-sided chance', () => {
  // Reference values from the standard normal table.
  it.each([
    [0, 0.5],
    [1, 0.158655254],
    [1.645, 0.049984603],
    [1.96, 0.024997895],
    [2.326, 0.010009587],
    [3, 0.001349898],
    [-1.96, 0.975002105],
  ])('P(Z ≥ %s) = %s', (z, p) => {
    expect(upperTail(z)).toBeCloseTo(p, 6);
  });

  it('stays accurate far out in the tail', () => {
    expect(upperTail(5) / 2.866515719e-7).toBeCloseTo(1, 5);
    expect(upperTail(6) / 9.865876451e-10).toBeCloseTo(1, 5);
    expect(erfc(0)).toBeCloseTo(1, 7);
  });

  it('turns a chance into "1 in X"', () => {
    expect(oneIn(upperTail(0.97))).toBe(6);
    expect(oneIn(upperTail(1.645))).toBe(20);
    expect(oneIn(upperTail(1.96))).toBe(40);
    expect(oneIn(upperTail(2.326))).toBe(100);
  });
});

describe("Stouffer's method", () => {
  it('sums the scores and divides by the square root of the count', () => {
    expect(stouffer([1, 2, 3])).toBeCloseTo(3.464102, 6);
    expect(stouffer([1.96, -1.96])).toBe(0);
    expect(stouffer([0.5, 0.5, 0.5, 0.5])).toBeCloseTo(1, 10);
    expect(stouffer([])).toBe(0);
    expect(stoufferFromSum(6, 3)).toBeCloseTo(stouffer([1, 2, 3]), 12);
    expect(stoufferFromSum(0, 0)).toBe(0);
  });
});

describe('wording', () => {
  it('formats scores with a sign and a real minus', () => {
    expect(formatZ(0.632)).toBe('+0.63');
    expect(formatZ(-0.8)).toBe('−0.80');
    expect(formatZ(0.001)).toBe('0.00');
    expect(formatZ(-0.004)).toBe('0.00');
  });

  it('describes one run at its real odds', () => {
    expect(runVerdict(0.97, 'Glacier', 'Ember')).toBe('About 1 in 6 runs pull this far toward Glacier by chance. Normal.');
    expect(runVerdict(-0.97, 'Glacier', 'Ember')).toBe('About 1 in 6 runs pull this far toward Ember by chance. Normal.');
    expect(runVerdict(2.1, 'Glacier', 'Ember')).toBe(
      'About 1 in 56 runs pull this far toward Glacier by chance. Interesting, but one run proves nothing.',
    );
    expect(runVerdict(0, 'Glacier', 'Ember')).toBe('Dead even. This is what chance looks like.');
  });

  it('describes a total, with psi-missing below chance', () => {
    expect(totalVerdict(-0.8, 40)).toBe('After 40 runs your total is −0.80: within chance.');
    expect(totalVerdict(-1.96, 40)).toBe(
      'After 40 runs your total is −1.96. Below chance, which researchers call psi-missing. Chance alone does this about 1 time in 40.',
    );
    expect(totalVerdict(1.96, 40)).toBe(
      'After 40 runs your total is +1.96. Above chance. Chance alone does this about 1 time in 40.',
    );
    expect(totalVerdict(0.2, 1)).toBe('After 1 run your total is +0.20: within chance.');
    expect(totalVerdict(0.42, 12400, 'the total')).toBe('After 12,400 runs the total is +0.42: within chance.');
  });
});
