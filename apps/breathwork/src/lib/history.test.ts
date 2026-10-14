import { describe, expect, it } from 'vitest';
import { HISTORY_DAYS } from './content';
import {
  addRecord,
  addWeeks,
  earliestWeek,
  MAX_RECORDS,
  pruneHistory,
  recordId,
  sanitizeHistory,
  weekDays,
  weekdayName,
  weekLabel,
  weekStart,
  weekSummary,
  type SessionRecord,
} from './history';

const DAY = 86_400_000;
// Local times, so the tests pass in any time zone.
const wed = new Date(2026, 9, 14, 9, 30); // Wednesday 14 Oct 2026

function record(at: Date | number, patch: Partial<SessionRecord> = {}): SessionRecord {
  const time = typeof at === 'number' ? at : at.getTime();
  return {
    id: `id${String(time).padStart(14, '0')}`,
    at: time,
    techniqueId: 'box',
    name: 'Box',
    phases: [
      { kind: 'in', ms: 4000 },
      { kind: 'hold', ms: 4000 },
      { kind: 'out', ms: 4000 },
      { kind: 'hold', ms: 4000 },
    ],
    durationMs: 304_000,
    ...patch,
  };
}

describe('recordId', () => {
  it('is 16 random characters', () => {
    expect(recordId()).toMatch(/^[a-z2-9]{16}$/);
    expect(recordId()).not.toBe(recordId());
  });
});

describe('keeping history', () => {
  it('keeps sessions in time order', () => {
    const later = record(wed.getTime() + 1000);
    const earlier = record(wed.getTime());
    expect(addRecord([later], earlier, wed.getTime()).map((r) => r.at)).toEqual([earlier.at, later.at]);
  });

  it(`drops sessions older than ${HISTORY_DAYS} days`, () => {
    const now = wed.getTime();
    const old = record(now - (HISTORY_DAYS + 1) * DAY);
    const kept = record(now - (HISTORY_DAYS - 1) * DAY);
    expect(pruneHistory([old, kept], now)).toEqual([kept]);
    expect(addRecord([old], record(now), now)).toHaveLength(1);
  });

  it('does not add the same session twice', () => {
    const r = record(wed);
    expect(addRecord([r], r, wed.getTime())).toHaveLength(1);
  });

  it(`never holds more than ${MAX_RECORDS} sessions`, () => {
    const many = Array.from({ length: MAX_RECORDS }, (_, i) => record(wed.getTime() - i * 60_000));
    const next = addRecord(many, record(wed.getTime() + 1), wed.getTime() + 1);
    expect(next).toHaveLength(MAX_RECORDS);
    expect(next.at(-1)!.at).toBe(wed.getTime() + 1);
  });

  it('cleans what comes out of storage', () => {
    const good = record(wed);
    expect(
      sanitizeHistory([
        good,
        { ...good, id: 'short' },
        { ...good, id: 'x'.repeat(16), phases: [{ kind: 'sniff', ms: 1 }] },
        { ...good, id: 'y'.repeat(16), durationMs: 0 },
        null,
        'junk',
      ]),
    ).toEqual([good]);
    expect(sanitizeHistory(undefined)).toEqual([]);
  });
});

describe('weeks', () => {
  it('start on Monday at local midnight', () => {
    expect(weekStart(wed)).toEqual(new Date(2026, 9, 12));
    expect(weekStart(new Date(2026, 9, 18, 23, 59))).toEqual(new Date(2026, 9, 12)); // Sunday
    expect(weekStart(new Date(2026, 9, 12, 0, 0))).toEqual(new Date(2026, 9, 12)); // Monday
  });

  it('step back and forward by whole weeks, also across clock changes', () => {
    expect(addWeeks(new Date(2026, 9, 26), -1)).toEqual(new Date(2026, 9, 19));
    expect(addWeeks(new Date(2026, 2, 23), 1)).toEqual(new Date(2026, 2, 30));
  });

  it('put each session on its day, and leave other days empty', () => {
    const days = weekDays([record(wed), record(new Date(2026, 9, 14, 21)), record(new Date(2026, 9, 17, 8))], weekStart(wed));
    expect(days.map((d) => d.records.length)).toEqual([0, 0, 2, 0, 0, 1, 0]);
    expect(days.map((d) => weekdayName(d.date))).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    expect(days[2]!.key).toBe('2026-10-14');
  });

  it('leave out sessions from other weeks', () => {
    const days = weekDays([record(new Date(2026, 9, 11, 23)), record(new Date(2026, 9, 19, 0, 1))], weekStart(wed));
    expect(days.every((d) => d.records.length === 0)).toBe(true);
  });

  it('are labelled plainly', () => {
    expect(weekLabel(new Date(2026, 9, 12))).toBe('12 to 18 Oct');
    expect(weekLabel(new Date(2026, 8, 28))).toBe('28 Sep to 4 Oct');
  });

  it('sum up sessions and minutes, and never mention missed days', () => {
    const days = weekDays([record(wed), record(new Date(2026, 9, 15))], weekStart(wed));
    expect(weekSummary(days)).toBe('2 sessions, 10 minutes');
    expect(weekSummary(weekDays([record(wed, { durationMs: 63_000 })], weekStart(wed)))).toBe('1 session, 1 minute');
    expect(weekSummary(weekDays([], weekStart(wed)))).toBe('No sessions this week yet.');
  });

  it('go back as far as the oldest kept session', () => {
    expect(earliestWeek([record(new Date(2026, 8, 2))], wed)).toEqual(new Date(2026, 7, 31));
    expect(earliestWeek([], wed)).toEqual(new Date(2026, 9, 12));
  });
});
