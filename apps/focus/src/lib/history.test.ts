import { describe, expect, it } from 'vitest';
import { addEntry, describeEntry, HISTORY_MAX, lastSevenDays, sanitizeHistory, type HistoryEntry } from './history';

const DAY = 86_400_000;
const NOW = 100 * DAY;
const entry = (at: number, minutes = 10, mode: HistoryEntry['mode'] = 'session'): HistoryEntry => ({
  at,
  name: 'Focus',
  beat: 18,
  minutes,
  mode,
});

describe('history', () => {
  it('puts the newest first and keeps at most HISTORY_MAX', () => {
    let history: HistoryEntry[] = [];
    for (let i = 0; i < HISTORY_MAX + 5; i++) history = addEntry(history, entry(i));
    expect(history).toHaveLength(HISTORY_MAX);
    expect(history[0]?.at).toBe(HISTORY_MAX + 4);
  });

  it('sums the last 7 days only', () => {
    const history = [entry(NOW - DAY, 10), entry(NOW - 6 * DAY, 45), entry(NOW - 8 * DAY, 90)];
    expect(lastSevenDays(history, NOW)).toEqual({ sessions: 2, minutes: 55 });
  });

  it('drops broken entries from storage', () => {
    expect(sanitizeHistory([entry(1), { at: 'x' }, null, { ...entry(2), mode: 'other' }])).toEqual([entry(1)]);
    expect(sanitizeHistory('nope')).toEqual([]);
  });

  it('describes an entry', () => {
    expect(describeEntry(entry(1, 10, 'prime'))).toBe('Prime, 10 min');
    expect(describeEntry(entry(1, 45))).toBe('Session, 45 min');
  });
});
