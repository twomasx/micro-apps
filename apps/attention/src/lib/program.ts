import type { SessionRecord, TestRecord } from './records';
import { STAIRCASE } from './staircase';

/** The study ran 30 practice days: 5 a week for 6 weeks. */
export const PROGRAM_DAYS = 30;
/** A weekly test is offered after each of these practice days. */
export const TEST_AFTER_DAYS = [5, 10, 15, 20, 25, 30] as const;

/** Local calendar date as YYYY-MM-DD. Practice days follow the user's own midnight. */
export function localDate(epochMs: number): string {
  const d = new Date(epochMs);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Dates with at least one answered stretch, oldest first. Missed days simply don't appear. */
export function practiceDates(sessions: readonly SessionRecord[]): string[] {
  const dates = new Set<string>();
  for (const session of sessions) if (session.stretches.length > 0) dates.add(session.date);
  return [...dates].sort();
}

export interface DayStatus {
  /** "Day N of 30". Today's number whether or not today has been practiced yet. */
  dayNumber: number;
  practicedToday: boolean;
  /** Practice days done, today included once it has an answered stretch. */
  completedDays: number;
}

export function dayStatus(sessions: readonly SessionRecord[], today: string): DayStatus {
  const dates = practiceDates(sessions);
  const index = dates.indexOf(today);
  const practicedToday = index >= 0;
  return {
    dayNumber: practicedToday ? index + 1 : dates.length + 1,
    practicedToday,
    completedDays: dates.length,
  };
}

/** Where the next stretch starts: the level the last session reached, no warm-up (as in the paper). */
export function currentLevel(sessions: readonly SessionRecord[]): number {
  let latest: SessionRecord | null = null;
  for (const session of sessions) {
    if (session.stretches.length > 0 && (!latest || session.startedAt > latest.startedAt)) latest = session;
  }
  return latest ? latest.nextSeconds : STAIRCASE.firstSeconds;
}

/** Minutes of focus time a day in the study: 20 in weeks 1 and 2, 25 in weeks 3 and 4, 30 after. */
export function studyMinutes(dayNumber: number): number {
  if (dayNumber <= 10) return 20;
  if (dayNumber <= 20) return 25;
  return 30;
}

export type TestPrompt = { kind: 'baseline' } | { kind: 'weekly'; afterDay: number } | null;

/** Which test to suggest on the Today screen, if any. The test can always be taken anyway. */
export function testPrompt(completedDays: number, tests: readonly TestRecord[]): TestPrompt {
  if (tests.length === 0 && completedDays === 0) return { kind: 'baseline' };
  let milestone = 0;
  for (const day of TEST_AFTER_DAYS) if (day <= completedDays) milestone = day;
  if (milestone === 0) return null;
  const taken = tests.some((test) => test.afterPracticeDays >= milestone);
  return taken ? null : { kind: 'weekly', afterDay: milestone };
}
