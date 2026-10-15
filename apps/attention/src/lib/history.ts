import type { ProbeRecord, SessionRecord, StretchRecord } from './records';
import { clampStretch } from './staircase';

/** A hard cap so storage can never grow without bound: 10 sessions a day for a year and a half. */
export const MAX_SESSIONS = 5000;

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function sanitizeProbe(raw: unknown): ProbeRecord | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.atSeconds !== 'number' || typeof r.heard !== 'boolean') return null;
  return { atSeconds: r.atSeconds, heard: r.heard, earlyTaps: typeof r.earlyTaps === 'number' ? r.earlyTaps : 0 };
}

function sanitizeStretch(raw: unknown): StretchRecord | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.seconds !== 'number' || !Number.isFinite(r.seconds) || typeof r.stayed !== 'boolean') return null;
  return { seconds: r.seconds, stayed: r.stayed, probe: sanitizeProbe(r.probe) };
}

function sanitizeSession(raw: unknown): SessionRecord | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || typeof r.startedAt !== 'number') return null;
  if (typeof r.date !== 'string' || !DATE.test(r.date)) return null;
  if (!Array.isArray(r.stretches)) return null;
  const stretches = r.stretches.map(sanitizeStretch).filter((s): s is StretchRecord => s !== null);
  return {
    id: r.id,
    startedAt: r.startedAt,
    date: r.date,
    targetSeconds: typeof r.targetSeconds === 'number' ? r.targetSeconds : 600,
    stretches,
    nextSeconds: clampStretch(typeof r.nextSeconds === 'number' ? r.nextSeconds : Number.NaN),
    finished: r.finished === true,
  };
}

/** Whatever was in storage, as a clean list in time order. Broken entries are dropped. */
export function sanitizeSessions(raw: unknown): SessionRecord[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(sanitizeSession)
    .filter((s): s is SessionRecord => s !== null)
    .sort((a, b) => a.startedAt - b.startedAt);
}

/** Adds a session or replaces the saved copy of it (a session is saved after every answer). */
export function upsertSession(sessions: readonly SessionRecord[], record: SessionRecord): SessionRecord[] {
  const next = [...sessions.filter((s) => s.id !== record.id), record].sort((a, b) => a.startedAt - b.startedAt);
  return next.slice(-MAX_SESSIONS);
}

/** The latest session with at least one answered stretch. */
export function latestSession(sessions: readonly SessionRecord[]): SessionRecord | null {
  for (let i = sessions.length - 1; i >= 0; i--) if (sessions[i]!.stretches.length > 0) return sessions[i]!;
  return null;
}
