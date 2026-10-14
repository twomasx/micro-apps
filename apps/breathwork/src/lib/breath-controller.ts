import { createCuePlayer, cueFor, type CueKind, type CuePlayer } from './cues';
import { breathAt, breathAtEnd, phaseKey, type BreathState } from './engine';
import { vibrateFor } from './haptics';
import {
  createSession,
  elapsedMs,
  formatClock,
  pauseSession,
  remainingMs,
  sessionStatus,
  startSession,
  type Session,
  type SessionStatus,
} from './session';
import type { Technique } from './techniques';
import { createWakeLock, type ScreenWakeLock } from './wake-lock';

/**
 * What a theme draws, once per animation frame while a session runs and once after every
 * other change. A theme only reads this; it never changes the session.
 */
export interface BreathFrame {
  technique: Technique;
  status: SessionStatus;
  breath: BreathState;
  elapsedMs: number;
  remainingMs: number;
  durationMs: number;
  /** Share of the session done, 0 to 1. */
  sessionProgress: number;
  notice: Notice | null;
}

/** "away": the page was hidden, so the session paused. Shown until the next start. */
export type Notice = 'away';

/** The parts of a frame that text on screen needs. A new object only when one of them changes. */
export interface BreathSnapshot {
  technique: Technique;
  status: SessionStatus;
  phaseIndex: number;
  word: string;
  hint: string;
  secondsLeft: number;
  clock: string;
  notice: Notice | null;
  muted: boolean;
}

export interface ControllerDeps {
  now: () => number;
  requestFrame: (callback: () => void) => number;
  cancelFrame: (id: number) => void;
  cues: Pick<CuePlayer, 'prepare' | 'play' | 'setMuted' | 'muted'>;
  vibrate: (kind: CueKind) => void;
  wakeLock: Pick<ScreenWakeLock, 'acquire' | 'release'>;
  visibility: { isHidden(): boolean; subscribe(onChange: () => void): () => void };
}

export interface BreathController {
  /** Starts or resumes. Call it from a tap or key press, so sound can start. */
  start(): void;
  pause(): void;
  toggle(): void;
  /** Back to the start of the session, not running. */
  reset(): void;
  /** Changes technique and length. Stops any running session. */
  select(technique: Technique, durationMs: number): void;
  setMuted(muted: boolean): void;
  dismissNotice(): void;
  frame(): BreathFrame;
  snapshot(): BreathSnapshot;
  /** Every frame, for themes. Returns an unsubscribe function. */
  onFrame(listener: (frame: BreathFrame) => void): () => void;
  /** Only when the snapshot changes, for React (useSyncExternalStore). */
  subscribe(listener: () => void): () => void;
  /** Called once each time a session finishes. */
  onComplete(listener: (frame: BreathFrame) => void): () => void;
  /**
   * Starts watching the page: a hidden page pauses the session. Returns a function that
   * stops watching and stops any running session (for a component unmounting).
   */
  connect(): () => void;
}

export function createBreathController(
  technique: Technique,
  durationMs: number,
  deps: ControllerDeps = browserDeps(),
): BreathController {
  let current = technique;
  let session: Session = createSession(durationMs);
  let notice: Notice | null = null;
  let lastKey: number | null = null;
  let frameId: number | null = null;
  let snap: BreathSnapshot | null = null;
  const frameListeners = new Set<(frame: BreathFrame) => void>();
  const snapListeners = new Set<() => void>();
  const completeListeners = new Set<(frame: BreathFrame) => void>();

  function frameAt(now: number): BreathFrame {
    const elapsed = elapsedMs(session, now);
    const status = sessionStatus(session, now);
    return {
      technique: current,
      status,
      breath: status === 'complete' ? breathAtEnd(current, elapsed) : breathAt(current, elapsed),
      elapsedMs: elapsed,
      remainingMs: remainingMs(session, now),
      durationMs: session.durationMs,
      sessionProgress: session.durationMs === 0 ? 1 : elapsed / session.durationMs,
      notice,
    };
  }

  function snapshotOf(frame: BreathFrame): BreathSnapshot {
    const next: BreathSnapshot = {
      technique: frame.technique,
      status: frame.status,
      phaseIndex: frame.breath.phaseIndex,
      word: frame.breath.phase.word,
      hint: frame.breath.phase.hint,
      secondsLeft: frame.breath.secondsLeft,
      clock: formatClock(frame.remainingMs),
      notice: frame.notice,
      muted: deps.cues.muted,
    };
    if (snap && (Object.keys(next) as (keyof BreathSnapshot)[]).every((key) => snap![key] === next[key])) return snap;
    return next;
  }

  /** Sends the frame to themes and, if the text changed, to React. */
  function emit(frame: BreathFrame) {
    for (const listener of frameListeners) listener(frame);
    const next = snapshotOf(frame);
    if (next !== snap) {
      snap = next;
      for (const listener of snapListeners) listener();
    }
  }

  /** `phaseS` is the length of the phase the cue starts, so the sound never outlasts it. */
  function cue(kind: CueKind, phaseS?: number) {
    deps.cues.play(kind, phaseS);
    deps.vibrate(kind);
  }

  function stopLoop() {
    if (frameId !== null) deps.cancelFrame(frameId);
    frameId = null;
  }

  function tick() {
    frameId = null;
    const frame = frameAt(deps.now());
    if (frame.status === 'complete') {
      finish(frame);
      return;
    }
    const key = phaseKey(frame.breath);
    if (frame.status === 'running' && key !== lastKey) {
      const { phases } = current;
      const previous = phases[(frame.breath.phaseIndex - 1 + phases.length) % phases.length] ?? null;
      cue(cueFor(frame.breath.phase, previous), frame.breath.phase.ms / 1000);
      lastKey = key;
    }
    emit(frame);
    if (frame.status === 'running') frameId = deps.requestFrame(tick);
  }

  function finish(frame: BreathFrame) {
    stopLoop();
    session = pauseSession(session, deps.now());
    void deps.wakeLock.release();
    cue('done');
    emit(frame);
    for (const listener of completeListeners) listener(frame);
  }

  function pauseFor(reason: 'user' | 'hidden') {
    const now = deps.now();
    if (sessionStatus(session, now) !== 'running') return;
    stopLoop();
    session = pauseSession(session, now, reason);
    if (reason === 'hidden') notice = 'away';
    void deps.wakeLock.release();
    emit(frameAt(now));
  }

  const controller: BreathController = {
    start() {
      const now = deps.now();
      const status = sessionStatus(session, now);
      if (status === 'running') return;
      // Muted means no audio at all, so music you are playing keeps playing.
      if (!deps.cues.muted) void deps.cues.prepare();
      if (status === 'complete') session = createSession(session.durationMs);
      // A fresh session cues its first phase; a resumed one waits for the next change.
      lastKey = status === 'paused' ? phaseKey(breathAt(current, elapsedMs(session, now))) : null;
      session = startSession(session, now);
      notice = null;
      void deps.wakeLock.acquire();
      tick();
    },
    pause() {
      pauseFor('user');
    },
    toggle() {
      if (sessionStatus(session, deps.now()) === 'running') controller.pause();
      else controller.start();
    },
    reset() {
      stopLoop();
      session = createSession(session.durationMs);
      lastKey = null;
      void deps.wakeLock.release();
      emit(frameAt(deps.now()));
    },
    select(technique, ms) {
      current = technique;
      session = createSession(ms);
      stopLoop();
      lastKey = null;
      notice = null;
      void deps.wakeLock.release();
      emit(frameAt(deps.now()));
    },
    setMuted(muted) {
      deps.cues.setMuted(muted);
      // Turning sound on is a tap, so the audio can start here.
      if (!muted) void deps.cues.prepare();
      emit(frameAt(deps.now()));
    },
    dismissNotice() {
      if (notice === null) return;
      notice = null;
      emit(frameAt(deps.now()));
    },
    frame() {
      return frameAt(deps.now());
    },
    snapshot() {
      snap ??= snapshotOf(frameAt(deps.now()));
      return snap;
    },
    onFrame(listener) {
      frameListeners.add(listener);
      return () => frameListeners.delete(listener);
    },
    subscribe(listener) {
      snapListeners.add(listener);
      return () => snapListeners.delete(listener);
    },
    onComplete(listener) {
      completeListeners.add(listener);
      return () => completeListeners.delete(listener);
    },
    connect() {
      const unsubscribe = deps.visibility.subscribe(() => {
        if (deps.visibility.isHidden()) pauseFor('hidden');
      });
      return () => {
        unsubscribe();
        pauseFor('user');
      };
    },
  };
  return controller;
}

/** The real browser: performance.now, requestAnimationFrame, Web Audio, vibration, wake lock. */
export function browserDeps(parts: Partial<ControllerDeps> = {}): ControllerDeps {
  return {
    now: () => performance.now(),
    requestFrame: (callback) => requestAnimationFrame(callback),
    cancelFrame: (id) => cancelAnimationFrame(id),
    cues: parts.cues ?? createCuePlayer(),
    vibrate: (kind) => void vibrateFor(kind),
    wakeLock: parts.wakeLock ?? createWakeLock(),
    visibility: {
      isHidden: () => document.visibilityState === 'hidden',
      subscribe(onChange) {
        document.addEventListener('visibilitychange', onChange);
        return () => document.removeEventListener('visibilitychange', onChange);
      },
    },
    ...parts,
  };
}
