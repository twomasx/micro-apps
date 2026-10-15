import { describe, expect, it } from 'vitest';
import { percentileFor, summaryOf, type NormsAnswer } from './norms';
import { test } from './testing';

const scores = new Array<number>(101).fill(0);
scores[60] = 100;
scores[70] = 50;
scores[80] = 50;
const ready: NormsAnswer = { length: 'quick', version: 1, ready: true, count: 200, scores };

describe('comparison with others', () => {
  it('shows nothing before the table is ready', () => {
    expect(percentileFor({ length: 'quick', version: 1, ready: false, count: 150 }, 80, 1)).toBeNull();
    expect(percentileFor(null, 80, 1)).toBeNull();
  });

  it('shows nothing for a different score version', () => {
    expect(percentileFor(ready, 80, 2)).toBeNull();
  });

  it('counts results below, and ties as half', () => {
    expect(percentileFor(ready, 70, 1)).toBe(63);
    expect(percentileFor(ready, 65, 1)).toBe(50);
    expect(percentileFor(ready, 100, 1)).toBe(100);
    expect(percentileFor(ready, 0, 1)).toBe(0);
  });

  it('sends only the summary, never the digits or the date', () => {
    const summary = summaryOf(test(3, { nth: 2 }));
    expect(Object.keys(summary).sort()).toEqual(
      ['anticipations', 'commissions', 'cv', 'length', 'meanRt', 'nth', 'omissions', 'score', 'sdRt', 'version'].sort(),
    );
    expect(summary.nth).toBe(2);
  });
});
