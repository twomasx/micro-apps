import type { Mode } from './settings';

/** One finished session, kept on this device only. A lifetime unlock feature. */
export interface HistoryEntry {
  /** When it finished, in ms since 1970. */
  at: number;
  /** Preset name, or "Custom". */
  name: string;
  beat: number;
  minutes: number;
  mode: Mode;
}

/** The oldest entries go first once the list is this long. */
export const HISTORY_MAX = 500;

export function addEntry(history: readonly HistoryEntry[], entry: HistoryEntry): HistoryEntry[] {
  return [entry, ...history].slice(0, HISTORY_MAX);
}

function isEntry(value: unknown): value is HistoryEntry {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.at === 'number' &&
    typeof entry.name === 'string' &&
    typeof entry.beat === 'number' &&
    typeof entry.minutes === 'number' &&
    (entry.mode === 'prime' || entry.mode === 'session')
  );
}

export function sanitizeHistory(raw: unknown): HistoryEntry[] {
  return Array.isArray(raw) ? raw.filter(isEntry).slice(0, HISTORY_MAX) : [];
}

export interface HistorySummary {
  sessions: number;
  minutes: number;
}

const DAY_MS = 86_400_000;

/** Sessions and minutes in the 7 days up to `now`. */
export function lastSevenDays(history: readonly HistoryEntry[], now: number): HistorySummary {
  const recent = history.filter((entry) => entry.at > now - 7 * DAY_MS && entry.at <= now);
  return { sessions: recent.length, minutes: recent.reduce((sum, entry) => sum + entry.minutes, 0) };
}

/** "Prime, 10 min" or "Session, 45 min". */
export function describeEntry(entry: HistoryEntry): string {
  return `${entry.mode === 'prime' ? 'Prime' : 'Session'}, ${entry.minutes} min`;
}
