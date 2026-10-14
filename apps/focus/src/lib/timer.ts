/**
 * Session timer on real elapsed time. It stores timestamps and never counts
 * ticks, so it stays correct after the screen has been off or the tab was throttled.
 * Every function takes `now` (milliseconds, like Date.now()) and returns a new timer.
 */
export interface SessionTimer {
  durationMs: number;
  /** Time played before the current run started. */
  playedMs: number;
  /** When the current run started, or null while paused. */
  startedAt: number | null;
}

export function createTimer(durationMs: number): SessionTimer {
  return { durationMs: Math.max(0, durationMs), playedMs: 0, startedAt: null };
}

export function isRunning(timer: SessionTimer): boolean {
  return timer.startedAt !== null;
}

export function elapsedMs(timer: SessionTimer, now: number): number {
  const run = timer.startedAt === null ? 0 : Math.max(0, now - timer.startedAt);
  return Math.min(timer.durationMs, timer.playedMs + run);
}

export function remainingMs(timer: SessionTimer, now: number): number {
  return timer.durationMs - elapsedMs(timer, now);
}

export function isComplete(timer: SessionTimer, now: number): boolean {
  return remainingMs(timer, now) <= 0;
}

/** Share of the session played, from 0 to 1. */
export function progress(timer: SessionTimer, now: number): number {
  return timer.durationMs === 0 ? 1 : elapsedMs(timer, now) / timer.durationMs;
}

export function startTimer(timer: SessionTimer, now: number): SessionTimer {
  if (timer.startedAt !== null || isComplete(timer, now)) return timer;
  return { ...timer, startedAt: now };
}

export function pauseTimer(timer: SessionTimer, now: number): SessionTimer {
  if (timer.startedAt === null) return timer;
  return { ...timer, playedMs: elapsedMs(timer, now), startedAt: null };
}

/** "09:05" for time left. Rounds up, so the clock reads 00:00 only when the session is over. */
export function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
