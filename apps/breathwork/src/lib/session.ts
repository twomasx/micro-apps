/**
 * A breathing session on real elapsed time. It stores timestamps and never counts frames,
 * so it stays exact when frames are dropped or slow. Every function takes `now`
 * (milliseconds, like performance.now()) and returns a new session.
 */
export interface Session {
  durationMs: number;
  /** Time breathed before the current run started. */
  playedMs: number;
  /** When the current run started, or null while not running. */
  startedAt: number | null;
  /** Why it is paused: you tapped pause, or the page was hidden. Null while running or before start. */
  pausedBy: PauseReason | null;
}

export type PauseReason = 'user' | 'hidden';
export type SessionStatus = 'ready' | 'running' | 'paused' | 'complete';

export function createSession(durationMs: number): Session {
  return { durationMs: Math.max(0, durationMs), playedMs: 0, startedAt: null, pausedBy: null };
}

export function elapsedMs(session: Session, now: number): number {
  const run = session.startedAt === null ? 0 : Math.max(0, now - session.startedAt);
  return Math.min(session.durationMs, session.playedMs + run);
}

export function remainingMs(session: Session, now: number): number {
  return session.durationMs - elapsedMs(session, now);
}

export function isComplete(session: Session, now: number): boolean {
  return remainingMs(session, now) <= 0;
}

export function sessionStatus(session: Session, now: number): SessionStatus {
  if (isComplete(session, now)) return 'complete';
  if (session.startedAt !== null) return 'running';
  return session.playedMs > 0 ? 'paused' : 'ready';
}

/** Starts, or resumes after a pause. Does nothing when running or complete. */
export function startSession(session: Session, now: number): Session {
  if (session.startedAt !== null || isComplete(session, now)) return session;
  return { ...session, startedAt: now, pausedBy: null };
}

export function pauseSession(session: Session, now: number, reason: PauseReason = 'user'): Session {
  if (session.startedAt === null) return session;
  return { ...session, playedMs: elapsedMs(session, now), startedAt: null, pausedBy: reason };
}

/** "4:57" for time left. Rounds up, so it reads 0:00 only when the session is over. */
export function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
