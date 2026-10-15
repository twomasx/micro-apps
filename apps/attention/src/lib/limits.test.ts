import { describe, expect, it } from 'vitest';
import { allowedSizes, canTrainToday, effectiveSize, isSessionSize, targetSeconds, visibleHistory } from './limits';
import { session, test } from './testing';

const day = (dayNumber: number, practicedToday = false) => ({
  dayNumber,
  practicedToday,
  completedDays: practicedToday ? dayNumber : dayNumber - 1,
});

describe('free tier', () => {
  it('trains on practice days 1 to 5', () => {
    expect(canTrainToday(false, day(1))).toBe(true);
    expect(canTrainToday(false, day(5))).toBe(true);
    expect(canTrainToday(false, day(5, true))).toBe(true);
    expect(canTrainToday(false, day(6))).toBe(false);
  });

  it('has no day limit once unlocked', () => {
    expect(canTrainToday(true, day(31))).toBe(true);
  });

  it('offers only 10 minutes free, and every size unlocked', () => {
    expect(allowedSizes(false)).toEqual([10]);
    expect(allowedSizes(true)).toEqual([10, 15, 20, 'study']);
    expect(effectiveSize('study', false)).toBe(10);
    expect(effectiveSize(20, true)).toBe(20);
  });

  it('checks saved sizes', () => {
    expect(isSessionSize(15)).toBe(true);
    expect(isSessionSize('study')).toBe(true);
    expect(isSessionSize(12)).toBe(false);
  });
});

describe('session targets', () => {
  it('counts minutes of focus time', () => {
    expect(targetSeconds(10, 1)).toBe(600);
    expect(targetSeconds(20, 30)).toBe(1200);
  });

  it('follows the study schedule by practice day', () => {
    expect(targetSeconds('study', 1)).toBe(1200);
    expect(targetSeconds('study', 11)).toBe(1500);
    expect(targetSeconds('study', 21)).toBe(1800);
  });
});

describe('progress history', () => {
  const sessions = ['01', '02', '03', '04', '05', '06', '07'].map((d) => session(`2026-10-${d}`));
  const tests = [test(0), test(5, { takenAt: 9_000 }), test(6)];

  it('shows a free user practice days 1 to 5 and the latest test', () => {
    const shown = visibleHistory(sessions, tests, false);
    expect(shown.sessions.map((s) => s.date)).toEqual(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05']);
    expect(shown.tests.map((t) => t.afterPracticeDays)).toEqual([5]);
    expect(shown.hidden).toBe(true);
  });

  it('shows everything once unlocked', () => {
    const shown = visibleHistory(sessions, tests, true);
    expect(shown.sessions).toHaveLength(7);
    expect(shown.tests).toHaveLength(3);
    expect(shown.hidden).toBe(false);
  });

  it('hides nothing when there is nothing beyond the free part', () => {
    expect(visibleHistory(sessions.slice(0, 2), [test(0)], false).hidden).toBe(false);
  });
});
