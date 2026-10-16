import { describe, expect, it } from 'vitest';
import {
  calendarFile,
  currentOrNextEvent,
  formatCountdown,
  hourWhen,
  hourLine,
  hourStatus,
  liveEventKey,
  zonedTime,
  type HourConfig,
} from './hour.ts';

const PACIFIC: HourConfig = { timeZone: 'America/Los_Angeles', hour: 21, minute: 0, minutes: 10, label: '9:00 pm Pacific' };
const utc = (s: string) => Date.parse(s);

describe('Pacific wall-clock time', () => {
  it('follows daylight saving', () => {
    // October is daylight time (UTC−7), December standard time (UTC−8).
    expect(zonedTime(2026, 10, 15, 21, 0, 'America/Los_Angeles')).toBe(utc('2026-10-16T04:00:00Z'));
    expect(zonedTime(2026, 12, 15, 21, 0, 'America/Los_Angeles')).toBe(utc('2026-12-16T05:00:00Z'));
    // The days the clocks change.
    expect(zonedTime(2026, 3, 8, 21, 0, 'America/Los_Angeles')).toBe(utc('2026-03-09T04:00:00Z'));
    expect(zonedTime(2026, 11, 1, 21, 0, 'America/Los_Angeles')).toBe(utc('2026-11-02T05:00:00Z'));
  });
});

describe('the daily event', () => {
  it('is today until it ends, then tomorrow', () => {
    // 3 pm Pacific on Oct 15.
    expect(currentOrNextEvent(utc('2026-10-15T22:00:00Z'), PACIFIC).key).toBe('2026-10-15');
    // 9:05 pm Pacific: live.
    expect(currentOrNextEvent(utc('2026-10-16T04:05:00Z'), PACIFIC).key).toBe('2026-10-15');
    // 9:10 pm Pacific: over, so the next one is Oct 16.
    const next = currentOrNextEvent(utc('2026-10-16T04:10:00Z'), PACIFIC);
    expect(next.key).toBe('2026-10-16');
    expect(next.startsAt).toBe(utc('2026-10-17T04:00:00Z'));
    // Across the clock change: Oct 31 is daylight time, Nov 1 standard time, still 9:00 pm on the wall clock.
    expect(currentOrNextEvent(utc('2026-11-01T05:00:00Z'), PACIFIC).startsAt).toBe(utc('2026-11-02T05:00:00Z'));
  });

  it('tags runs inside the 10 minutes only', () => {
    expect(liveEventKey(utc('2026-10-16T03:59:59Z'), PACIFIC)).toBeNull();
    expect(liveEventKey(utc('2026-10-16T04:00:00Z'), PACIFIC)).toBe('2026-10-15');
    expect(liveEventKey(utc('2026-10-16T04:09:59Z'), PACIFIC)).toBe('2026-10-15');
    expect(liveEventKey(utc('2026-10-16T04:10:00Z'), PACIFIC)).toBeNull();
  });

  it('shows a countdown in the last 3 hours, and says when it is live', () => {
    expect(hourStatus(utc('2026-10-15T20:00:00Z'), PACIFIC).kind).toBe('later');
    const soon = hourStatus(utc('2026-10-16T03:17:30Z'), PACIFIC);
    expect(soon.kind).toBe('soon');
    expect(hourLine(soon)).toBe('Intention Hour starts in 42 min.');
    const live = hourStatus(utc('2026-10-16T04:03:30Z'), PACIFIC);
    expect(hourLine(live)).toBe('Intention Hour is live. 6 min 30 s left.');
    expect(hourLine(hourStatus(utc('2026-10-15T20:00:00Z'), PACIFIC))).toBeNull();
  });

  it('gives the viewer their own time only when it differs', () => {
    const event = currentOrNextEvent(utc('2026-10-15T22:00:00Z'), PACIFIC);
    expect(hourWhen(event, 'America/Los_Angeles', PACIFIC)).toBe('9:00 pm Pacific');
    expect(hourWhen(event, 'America/Vancouver', PACIFIC)).toBe('9:00 pm Pacific');
    expect(hourWhen(event, 'America/New_York', PACIFIC)).toBe('9:00 pm Pacific (12:00 am your time)');
    expect(hourWhen(event, 'Europe/London', PACIFIC)).toBe('9:00 pm Pacific (5:00 am your time)');
  });

  it('formats countdowns plainly', () => {
    expect(formatCountdown(2 * 3600_000 + 14 * 60_000)).toBe('2 h 14 min');
    expect(formatCountdown(9 * 60_000 + 30_000)).toBe('9 min 30 s');
    expect(formatCountdown(45_000)).toBe('45 s');
  });
});

describe('the calendar file', () => {
  it('repeats daily at 9:00 pm in Los Angeles time for 10 minutes', () => {
    const event = currentOrNextEvent(utc('2026-10-15T22:00:00Z'), PACIFIC);
    const ics = calendarFile(event, 'https://polymadlabs.com/intention/', PACIFIC, utc('2026-10-15T22:00:00Z'));
    expect(ics).toContain('DTSTART;TZID=America/Los_Angeles:20261015T210000\r\n');
    expect(ics).toContain('DURATION:PT10M\r\n');
    expect(ics).toContain('RRULE:FREQ=DAILY\r\n');
    expect(ics).toContain('DTSTAMP:20261015T220000Z\r\n');
    expect(ics).toContain('BEGIN:VTIMEZONE\r\nTZID:America/Los_Angeles');
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    // Long lines are folded at 75 octets, continuing with a space.
    for (const line of ics.split('\r\n')) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    expect(ics.replace(/\r\n /g, '')).toContain('DESCRIPTION:Everyone runs at the same time for 10 minutes. https://polymadlabs.com/intention/\r\n');
  });
});
