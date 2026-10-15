import type { SessionRecord, StretchRecord } from './records';
import { nextStretch } from './staircase';

/**
 * One training session as a pure state machine. The hook owns the clock and the sounds:
 * it dispatches `bell` when a stretch's time is up and `begin` 3 s after an answer.
 */
export type Phase = 'ready' | 'stretch' | 'ask' | 'rest' | 'paused' | 'done';

/** About 1 in 4 stretches gets a tick probe. */
export const PROBE_CHANCE = 0.25;
/** No tick in the first or last 3 s of a stretch. */
export const PROBE_MARGIN_SECONDS = 3;
/** Pause between an answer and the next stretch's tok. */
export const REST_SECONDS = 3;

export interface StretchPlan {
  seconds: number;
  /** Seconds into the stretch when the tick plays, or null for no probe. */
  probeAtSeconds: number | null;
}

export interface CurrentStretch extends StretchPlan {
  /** Clock time the stretch began, in the hook's units (ms from performance.now). */
  startedAt: number;
  probePlayed: boolean;
  heard: boolean;
  earlyTaps: number;
}

export interface SessionState {
  phase: Phase;
  targetSeconds: number;
  /** Length of the next (or current) stretch. */
  nextSeconds: number;
  /** Sum of answered stretch lengths. */
  focusSeconds: number;
  stretches: StretchRecord[];
  current: CurrentStretch | null;
  /** The page was hidden mid-stretch at least once. Shown when the user comes back. */
  interrupted: boolean;
}

export type SessionAction =
  | { type: 'begin'; now: number; plan: StretchPlan }
  | { type: 'probePlayed' }
  | { type: 'tap' }
  | { type: 'bell' }
  | { type: 'answer'; stayed: boolean }
  | { type: 'hide' }
  | { type: 'end' };

export function initialSession(startSeconds: number, targetSeconds: number): SessionState {
  return {
    phase: 'ready',
    targetSeconds,
    nextSeconds: startSeconds,
    focusSeconds: 0,
    stretches: [],
    current: null,
    interrupted: false,
  };
}

/** Decides whether this stretch gets a tick, and when. `random` returns [0, 1). */
export function planStretch(seconds: number, probesOn: boolean, random: () => number = Math.random): StretchPlan {
  const window = seconds - 2 * PROBE_MARGIN_SECONDS;
  if (!probesOn || window <= 0 || random() >= PROBE_CHANCE) return { seconds, probeAtSeconds: null };
  return { seconds, probeAtSeconds: PROBE_MARGIN_SECONDS + random() * window };
}

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'begin': {
      if (state.phase !== 'ready' && state.phase !== 'rest' && state.phase !== 'paused') return state;
      // The stretch is always nextSeconds long. A tick planned for another length is dropped if it no longer fits.
      const seconds = state.nextSeconds;
      const at = action.plan.probeAtSeconds;
      const fits = at !== null && at >= PROBE_MARGIN_SECONDS && at <= seconds - PROBE_MARGIN_SECONDS;
      const current: CurrentStretch = {
        seconds,
        probeAtSeconds: fits ? at : null,
        startedAt: action.now,
        probePlayed: false,
        heard: false,
        earlyTaps: 0,
      };
      return { ...state, phase: 'stretch', current };
    }
    case 'probePlayed': {
      if (state.phase !== 'stretch' || !state.current || state.current.probeAtSeconds === null) return state;
      return { ...state, current: { ...state.current, probePlayed: true } };
    }
    case 'tap': {
      if (state.phase !== 'stretch' || !state.current || state.current.probeAtSeconds === null) return state;
      const current = state.current.probePlayed
        ? { ...state.current, heard: true }
        : { ...state.current, earlyTaps: state.current.earlyTaps + 1 };
      return { ...state, current };
    }
    case 'bell': {
      if (state.phase !== 'stretch') return state;
      return { ...state, phase: 'ask' };
    }
    case 'answer': {
      if (state.phase !== 'ask' || !state.current) return state;
      const { seconds, probeAtSeconds, heard, earlyTaps } = state.current;
      const record: StretchRecord = {
        seconds,
        stayed: action.stayed,
        probe: probeAtSeconds === null ? null : { atSeconds: Math.round(probeAtSeconds * 10) / 10, heard, earlyTaps },
      };
      const focusSeconds = state.focusSeconds + seconds;
      return {
        ...state,
        phase: focusSeconds >= state.targetSeconds ? 'done' : 'rest',
        nextSeconds: nextStretch(seconds, action.stayed),
        focusSeconds,
        stretches: [...state.stretches, record],
        current: null,
      };
    }
    case 'hide': {
      // A stretch cut off by leaving the page is thrown away: no answer, no focus time.
      if (state.phase === 'stretch') return { ...state, phase: 'paused', current: null, interrupted: true };
      if (state.phase === 'rest') return { ...state, phase: 'paused' };
      return state;
    }
    case 'end': {
      return { ...state, phase: 'done', current: null };
    }
  }
}

/** Seconds of the current stretch done, at clock time `now`. */
export function stretchElapsed(current: CurrentStretch, now: number): number {
  return Math.min(current.seconds, Math.max(0, (now - current.startedAt) / 1000));
}

export interface SessionSummary {
  focusSeconds: number;
  stretches: number;
  stayed: number;
  longestStayedSeconds: number;
  probesPlayed: number;
  probesHeard: number;
}

export function summarize(stretches: readonly StretchRecord[]): SessionSummary {
  let focusSeconds = 0;
  let stayed = 0;
  let longest = 0;
  let probesPlayed = 0;
  let probesHeard = 0;
  for (const stretch of stretches) {
    focusSeconds += stretch.seconds;
    if (stretch.stayed) {
      stayed++;
      longest = Math.max(longest, stretch.seconds);
    }
    if (stretch.probe) {
      probesPlayed++;
      if (stretch.probe.heard) probesHeard++;
    }
  }
  return {
    focusSeconds,
    stretches: stretches.length,
    stayed,
    longestStayedSeconds: longest,
    probesPlayed,
    probesHeard,
  };
}

/** The record saved when a session ends. Returns null when no stretch was answered. */
export function toRecord(
  state: SessionState,
  meta: { id: string; startedAt: number; date: string },
): SessionRecord | null {
  if (state.stretches.length === 0) return null;
  return {
    ...meta,
    targetSeconds: state.targetSeconds,
    stretches: state.stretches,
    nextSeconds: state.nextSeconds,
    finished: state.focusSeconds >= state.targetSeconds,
  };
}
