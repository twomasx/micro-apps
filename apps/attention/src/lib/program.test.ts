import { describe, expect, it } from 'vitest';
import { currentLevel, dayStatus, localDate, practiceDates, studyMinutes, testPrompt } from './program';
import { session, test } from './testing';

describe('practice days', () => {
  it('formats local dates', () => {
    expect(localDate(new Date(2026, 9, 5, 23, 59).getTime())).toBe('2026-10-05');
  });

  it('counts each date with an answered stretch once, and skips missed days without gaps', () => {
    const sessions = [session('2026-10-01'), session('2026-10-01'), session('2026-10-09'), session('2026-10-03')];
    expect(practiceDates(sessions)).toEqual(['2026-10-01', '2026-10-03', '2026-10-09']);
  });

  it('ignores sessions with no answered stretch', () => {
    expect(practiceDates([session('2026-10-01', { stretches: [] })])).toEqual([]);
  });

  it('numbers today as the next day until it is practiced', () => {
    const sessions = [session('2026-10-01'), session('2026-10-04')];
    expect(dayStatus(sessions, '2026-10-20')).toEqual({ dayNumber: 3, practicedToday: false, completedDays: 2 });
    const after = [...sessions, session('2026-10-20')];
    expect(dayStatus(after, '2026-10-20')).toEqual({ dayNumber: 3, practicedToday: true, completedDays: 3 });
  });

  it('starts at day 1', () => {
    expect(dayStatus([], '2026-10-15').dayNumber).toBe(1);
  });
});

describe('level carry-over', () => {
  it('starts at 20 s with no history', () => {
    expect(currentLevel([])).toBe(20);
  });

  it('starts where the latest session ended, with no warm-up', () => {
    const sessions = [
      session('2026-10-02', { nextSeconds: 45 }),
      session('2026-10-01', { nextSeconds: 30 }),
      session('2026-10-03', { nextSeconds: 99, stretches: [] }),
    ];
    expect(currentLevel(sessions)).toBe(45);
  });
});

describe('study schedule', () => {
  it('follows the paper: 20, 25, then 30 minutes', () => {
    expect([1, 10, 11, 20, 21, 30, 45].map(studyMinutes)).toEqual([20, 20, 25, 25, 30, 30, 30]);
  });
});

describe('test prompts', () => {
  it('asks for a baseline before the first session', () => {
    expect(testPrompt(0, [])).toEqual({ kind: 'baseline' });
  });

  it('does not ask again once a baseline exists', () => {
    expect(testPrompt(0, [test(0)])).toBeNull();
    expect(testPrompt(4, [test(0)])).toBeNull();
  });

  it('asks after practice days 5, 10, 15, 20, 25 and 30', () => {
    expect(testPrompt(5, [test(0)])).toEqual({ kind: 'weekly', afterDay: 5 });
    expect(testPrompt(7, [test(0)])).toEqual({ kind: 'weekly', afterDay: 5 });
    expect(testPrompt(7, [test(0), test(6)])).toBeNull();
    expect(testPrompt(30, [test(0), test(25)])).toEqual({ kind: 'weekly', afterDay: 30 });
  });

  it('asks only for the latest missed week, not every one', () => {
    expect(testPrompt(16, [test(0)])).toEqual({ kind: 'weekly', afterDay: 15 });
  });

  it('stops after day 30', () => {
    expect(testPrompt(40, [test(31)])).toBeNull();
  });
});
