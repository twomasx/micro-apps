import { describe, expect, it } from 'vitest';
import type { SartTrial } from './sart-score';
import { test } from './testing';
import { addTest, buildTestRecord, earlierResults, nthTest, sanitizeTests } from './tests';

const trials: SartTrial[] = [
  { digit: 1, size: 0, taps: [300] },
  { digit: 3, size: 2, taps: [] },
  { digit: 5, size: 4, taps: [420] },
];

describe('test records', () => {
  it('counts tests per length, for "first test" percentiles', () => {
    const tests = [test(0, { length: 'quick' }), test(5, { length: 'full' })];
    expect(nthTest(tests, 'quick')).toBe(2);
    expect(nthTest(tests, 'full')).toBe(2);
    expect(nthTest([], 'full')).toBe(1);
  });

  it('builds a record with its score and the practice days so far', () => {
    const record = buildTestRecord({
      id: 'abcdefghijkl',
      takenAt: 5,
      date: '2026-10-15',
      length: 'quick',
      trials,
      timing: null,
      tests: [],
      completedDays: 3,
    });
    expect(record).toMatchObject({ nth: 1, afterPracticeDays: 3, length: 'quick' });
    expect(record.score.commissions).toBe(0);
    expect(record.score.meanRt).toBe(360);
  });

  it('lists earlier results of the same length, oldest first', () => {
    const a = test(0, { id: 'a', takenAt: 1 });
    const b = test(5, { id: 'b', takenAt: 2, length: 'full' });
    const c = test(10, { id: 'c', takenAt: 3 });
    expect(earlierResults([c, b, a], c).map((t) => t.id)).toEqual(['a']);
  });

  it('cleans stored tests and works the score out again from the digits', () => {
    const stored = { ...test(0, { trials }), score: { score: 3, version: 1 } };
    const [clean] = sanitizeTests([stored, 'junk', { ...stored, id: 'x', length: 'medium' }]);
    expect(clean!.score.score).toBeGreaterThan(50);
    expect(sanitizeTests([stored, 'junk'])).toHaveLength(1);
    expect(sanitizeTests(null)).toEqual([]);
  });

  it('adds a test once, in time order', () => {
    const a = test(0, { id: 'a', takenAt: 2 });
    const b = test(0, { id: 'b', takenAt: 1 });
    expect(addTest(addTest([a], b), b).map((t) => t.id)).toEqual(['b', 'a']);
  });
});
