import { describe, expect, it } from 'vitest';
import { dayRows, nextTestDay, testSeries, weeks } from './progress';
import { session, stretch, test } from './testing';

describe('progress', () => {
  const sessions = [
    session('2026-10-03', { id: 'b', startedAt: 3, stretches: [stretch(30, true), stretch(33, false)] }),
    session('2026-10-01', { id: 'a', startedAt: 1, stretches: [stretch(20, true)] }),
    session('2026-10-03', { id: 'c', startedAt: 4, stretches: [stretch(26, true)] }),
    session('2026-10-02', { id: 'x', startedAt: 2, stretches: [] }),
  ];

  it('makes one row per practice day, numbered without gaps', () => {
    const rows = dayRows(sessions);
    expect(rows.map((r) => [r.day, r.date])).toEqual([
      [1, '2026-10-01'],
      [2, '2026-10-03'],
    ]);
  });

  it('puts every stretch of the day in order, with its session for the brush seed', () => {
    const [, day2] = dayRows(sessions);
    expect(day2!.circles.map((c) => [c.sessionId, c.index])).toEqual([
      ['b', 0],
      ['b', 1],
      ['c', 0],
    ]);
    expect(day2).toMatchObject({ focusSeconds: 89, held: 2, longestHeldSeconds: 30 });
  });

  it('counts only held stretches as the longest', () => {
    const rows = dayRows([session('2026-10-01', { stretches: [stretch(40, false)] })]);
    expect(rows[0]!.longestHeldSeconds).toBe(0);
  });

  it('groups days into weeks of 5, as in the study', () => {
    const many = Array.from({ length: 12 }, (_, i) => session(`2026-10-${String(i + 1).padStart(2, '0')}`));
    expect(weeks(dayRows(many)).map((w) => [w.week, w.days.length])).toEqual([
      [1, 5],
      [2, 5],
      [3, 2],
    ]);
  });

  it('lists test results of one length, oldest first', () => {
    const tests = [test(5, { id: 'b', takenAt: 2 }), test(0, { id: 'a', takenAt: 1 }), test(0, { id: 'f', length: 'full' })];
    expect(testSeries(tests, 'quick').map((t) => t.id)).toEqual(['a', 'b']);
  });

  it('knows when the next weekly test comes', () => {
    expect(nextTestDay(0)).toBe(5);
    expect(nextTestDay(5)).toBe(10);
    expect(nextTestDay(29)).toBe(30);
    expect(nextTestDay(30)).toBeNull();
  });
});
