import { practiceDates, studyMinutes, type DayStatus } from './program';
import type { SessionRecord, TestRecord } from './records';

/** Free: the first 5 practice days, 10 minute sessions. The test is always free. */
export const FREE_DAYS = 5;

export type SessionSize = 10 | 15 | 20 | 'study';
export const ALL_SIZES: readonly SessionSize[] = [10, 15, 20, 'study'];
export const FREE_SIZE: SessionSize = 10;

export function isSessionSize(value: unknown): value is SessionSize {
  return (ALL_SIZES as readonly unknown[]).includes(value);
}

/** A free user can train on practice days 1 to 5, including more sessions on day 5. */
export function canTrainToday(unlocked: boolean, status: DayStatus): boolean {
  return unlocked || status.dayNumber <= FREE_DAYS;
}

export function allowedSizes(unlocked: boolean): readonly SessionSize[] {
  return unlocked ? ALL_SIZES : [FREE_SIZE];
}

/** A saved paid size falls back to 10 minutes while the device is not unlocked. */
export function effectiveSize(size: SessionSize, unlocked: boolean): SessionSize {
  return unlocked ? size : FREE_SIZE;
}

/** Focus time a session aims for, in seconds. */
export function targetSeconds(size: SessionSize, dayNumber: number): number {
  return (size === 'study' ? studyMinutes(dayNumber) : size) * 60;
}

/**
 * What the progress page shows. Free: sessions on practice days 1 to 5 and the latest test.
 * Unlocked: everything.
 */
export function visibleHistory(
  sessions: readonly SessionRecord[],
  tests: readonly TestRecord[],
  unlocked: boolean,
): { sessions: SessionRecord[]; tests: TestRecord[]; hidden: boolean } {
  if (unlocked) return { sessions: [...sessions], tests: [...tests], hidden: false };
  const freeDates = new Set(practiceDates(sessions).slice(0, FREE_DAYS));
  const shown = sessions.filter((session) => freeDates.has(session.date));
  const latest = tests.reduce<TestRecord | null>((a, b) => (!a || b.takenAt > a.takenAt ? b : a), null);
  const shownTests = latest ? [latest] : [];
  return {
    sessions: shown,
    tests: shownTests,
    hidden: shown.length < sessions.length || shownTests.length < tests.length,
  };
}
