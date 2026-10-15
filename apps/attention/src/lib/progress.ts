import { TEST_AFTER_DAYS } from './program';
import type { SessionRecord, StretchRecord, TestRecord } from './records';
import type { SartLength } from './sart-score';

/** Practice days in a program week: the study trained 5 days a week. */
export const DAYS_PER_WEEK = 5;

export interface DayCircle {
  sessionId: string;
  /** Index of the stretch within its session (its brush seed). */
  index: number;
  stretch: StretchRecord;
}

export interface DayRow {
  /** Practice day number, 1 for the first day practiced. */
  day: number;
  date: string;
  circles: DayCircle[];
  focusSeconds: number;
  held: number;
  /** Longest stretch answered "I stayed", 0 if none. */
  longestHeldSeconds: number;
}

/** One row per practice day, oldest first. Days without practice simply don't appear. */
export function dayRows(sessions: readonly SessionRecord[]): DayRow[] {
  const byDate = new Map<string, SessionRecord[]>();
  for (const session of [...sessions].sort((a, b) => a.startedAt - b.startedAt)) {
    if (session.stretches.length === 0) continue;
    const list = byDate.get(session.date) ?? [];
    list.push(session);
    byDate.set(session.date, list);
  }
  return [...byDate.keys()].sort().map((date, i) => {
    const circles: DayCircle[] = [];
    for (const session of byDate.get(date)!) {
      session.stretches.forEach((stretch, index) => circles.push({ sessionId: session.id, index, stretch }));
    }
    let focusSeconds = 0;
    let held = 0;
    let longest = 0;
    for (const { stretch } of circles) {
      focusSeconds += stretch.seconds;
      if (stretch.stayed) {
        held++;
        longest = Math.max(longest, stretch.seconds);
      }
    }
    return { day: i + 1, date, circles, focusSeconds, held, longestHeldSeconds: longest };
  });
}

export interface WeekGroup {
  week: number;
  days: DayRow[];
}

/** Program weeks of 5 practice days, as in the study. */
export function weeks(rows: readonly DayRow[]): WeekGroup[] {
  const groups: WeekGroup[] = [];
  for (const row of rows) {
    const week = Math.ceil(row.day / DAYS_PER_WEEK);
    const group = groups.at(-1);
    if (group && group.week === week) group.days.push(row);
    else groups.push({ week, days: [row] });
  }
  return groups;
}

/** Test results of one length, oldest first. */
export function testSeries(tests: readonly TestRecord[], length: SartLength): TestRecord[] {
  return tests.filter((t) => t.length === length).sort((a, b) => a.takenAt - b.takenAt);
}

/** The practice day after which the next weekly test comes, or null after day 30. */
export function nextTestDay(completedDays: number): number | null {
  return TEST_AFTER_DAYS.find((day) => day > completedDays) ?? null;
}
