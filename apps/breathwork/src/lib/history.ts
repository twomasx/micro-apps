import { HISTORY_DAYS } from './content';
import type { PhaseKind } from './techniques';

/**
 * Finished sessions, kept on this device only. Each one keeps its phases, so its shape can be
 * drawn again on the week view even for a custom pattern that was later deleted.
 */
export interface SessionRecord {
  /** Random, at least 12 characters. */
  id: string;
  /** When the session finished, in ms since 1970. */
  at: number;
  techniqueId: string;
  name: string;
  phases: { kind: PhaseKind; ms: number }[];
  durationMs: number;
}

const DAY_MS = 86_400_000;
/** A hard cap so storage can never grow without bound: 20 sessions a day for a year. */
export const MAX_RECORDS = 7300;
const KINDS: readonly PhaseKind[] = ['in', 'hold', 'out'];
const ID_ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';

/** Random record id, 16 characters (80 bits). Never sequential. */
export function recordId(): string {
  let id = '';
  for (const byte of crypto.getRandomValues(new Uint8Array(16))) id += ID_ALPHABET[byte & 31];
  return id;
}

/** Drops sessions older than the privacy page promises to keep. */
export function pruneHistory(records: readonly SessionRecord[], now: number): SessionRecord[] {
  const oldest = now - HISTORY_DAYS * DAY_MS;
  return records.filter((record) => record.at >= oldest);
}

/** Adds a finished session, keeps the list in time order, drops old ones. */
export function addRecord(records: readonly SessionRecord[], record: SessionRecord, now: number): SessionRecord[] {
  const next = pruneHistory([...records.filter((r) => r.id !== record.id), record], now).sort((a, b) => a.at - b.at);
  return next.slice(Math.max(0, next.length - MAX_RECORDS));
}

/** Turns whatever was in storage into valid records. */
export function sanitizeHistory(raw: unknown): SessionRecord[] {
  if (!Array.isArray(raw)) return [];
  const records: SessionRecord[] = [];
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue;
    const r = item as Record<string, unknown>;
    if (typeof r.id !== 'string' || r.id.length < 12) continue;
    if (typeof r.at !== 'number' || !Number.isFinite(r.at)) continue;
    if (typeof r.techniqueId !== 'string' || typeof r.name !== 'string') continue;
    if (typeof r.durationMs !== 'number' || !(r.durationMs > 0)) continue;
    if (!Array.isArray(r.phases) || r.phases.length === 0) continue;
    const phases: SessionRecord['phases'] = [];
    for (const p of r.phases as unknown[]) {
      const phase = p as Record<string, unknown> | null;
      const kind = KINDS.find((k) => k === phase?.kind);
      const ms = phase?.ms;
      if (kind && typeof ms === 'number' && ms > 0) phases.push({ kind, ms });
    }
    if (phases.length !== r.phases.length) continue;
    records.push({ id: r.id, at: r.at, techniqueId: r.techniqueId, name: r.name, phases, durationMs: r.durationMs });
  }
  return records.sort((a, b) => a.at - b.at);
}

/** Midnight at the start of the Monday of this date's week, in local time. */
export function weekStart(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysSinceMonday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - daysSinceMonday);
  return start;
}

/** The same weekday `weeks` weeks later (negative for earlier), at local midnight. Safe across clock changes. */
export function addWeeks(date: Date, weeks: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + weeks * 7);
}

export interface WeekDay {
  date: Date;
  /** Local date as 2026-10-14, for keys. */
  key: string;
  records: SessionRecord[];
}

/** Local date as 2026-10-14. */
export function dateKey(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

/** Monday to Sunday of the week starting at `start`, each day with its sessions in the order they happened. */
export function weekDays(records: readonly SessionRecord[], start: Date): WeekDay[] {
  const days: WeekDay[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    days.push({ date, key: dateKey(date), records: [] });
  }
  const byKey = new Map(days.map((day) => [day.key, day]));
  for (const record of [...records].sort((a, b) => a.at - b.at)) {
    byKey.get(dateKey(new Date(record.at)))?.records.push(record);
  }
  return days;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** "13 to 19 Oct", or "29 Sep to 5 Oct" across months. */
export function weekLabel(start: Date): string {
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
  const endText = `${end.getDate()} ${MONTHS[end.getMonth()]}`;
  if (end.getMonth() === start.getMonth()) return `${start.getDate()} to ${endText}`;
  return `${start.getDate()} ${MONTHS[start.getMonth()]} to ${endText}`;
}

/** "Mon" to "Sun". */
export function weekdayName(date: Date): string {
  return WEEKDAYS[(date.getDay() + 6) % 7]!;
}

/** Plain totals for a week: "4 sessions, 19 minutes". Nothing about missed days. */
export function weekSummary(days: readonly WeekDay[]): string {
  const sessions = days.reduce((n, day) => n + day.records.length, 0);
  if (sessions === 0) return 'No sessions this week yet.';
  const minutes = Math.round(days.reduce((n, day) => n + day.records.reduce((m, r) => m + r.durationMs, 0), 0) / 60_000);
  return `${sessions} ${sessions === 1 ? 'session' : 'sessions'}, ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
}

/** The earliest week the week view can go back to: the oldest kept session's week. */
export function earliestWeek(records: readonly SessionRecord[], now: Date): Date {
  const first = records[0];
  return weekStart(first ? new Date(Math.min(first.at, now.getTime())) : now);
}
