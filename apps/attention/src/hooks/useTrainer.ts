import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { createSoundPlayer } from '../audio/sounds';
import { buzz } from '../lib/haptics';
import { randomId } from '../lib/ids';
import { localDate } from '../lib/program';
import type { SessionRecord } from '../lib/records';
import {
  initialSession,
  planStretch,
  REST_SECONDS,
  sessionReducer,
  stretchElapsed,
  toRecord,
  type SessionState,
} from '../lib/session';
import { useWakeLock } from './useWakeLock';

export interface TrainerOptions {
  startSeconds: number;
  targetSeconds: number;
  probes: boolean;
  volume: number;
  onSave: (record: SessionRecord) => void;
}

export interface Trainer {
  state: SessionState;
  /** Session id, also the seed source for this session's circles. */
  id: string;
  /** Starts the first stretch. Call from a tap: phones only allow sound after one. */
  begin: () => Promise<void>;
  /** After the page was hidden: starts the stretch again. Also from a tap. */
  resume: () => Promise<void>;
  answer: (stayed: boolean) => void;
  /** A tap anywhere during a stretch (for the tick probe). */
  tap: () => void;
  end: () => void;
  /** 0 to 1 through the current stretch. Read every frame by the brush. */
  progress: () => number;
}

/**
 * Runs the training loop: the clock, the three sounds, vibration, the wake lock,
 * pausing when the page is hidden, and saving after every answer.
 * The rules themselves live in lib/session.ts.
 */
export function useTrainer(options: TrainerOptions): Trainer {
  const [state, dispatch] = useReducer(sessionReducer, options, (o) => initialSession(o.startSeconds, o.targetSeconds));
  const stateRef = useRef(state);
  const optionsRef = useRef(options);
  useEffect(() => {
    stateRef.current = state;
    optionsRef.current = options;
  });

  const player = useMemo(() => createSoundPlayer(options.volume), []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => player.setVolume(options.volume), [player, options.volume]);
  const { lock } = useWakeLock();
  const [meta] = useState(() => {
    const now = Date.now();
    return { id: randomId(), startedAt: now, date: localDate(now) };
  });

  const startStretch = useCallback(() => {
    const plan = planStretch(stateRef.current.nextSeconds, optionsRef.current.probes);
    dispatch({ type: 'begin', now: performance.now(), plan });
    player.play('tok');
    buzz('tok');
  }, [player]);

  const wake = useCallback(async () => {
    // Both must start inside the tap. Neither blocks the stretch if refused.
    const ready = player.prepare();
    void lock.acquire();
    await ready;
  }, [player, lock]);

  const begin = useCallback(async () => {
    await wake();
    startStretch();
  }, [wake, startStretch]);

  // The stretch: the tick (if this one has a probe), then the bell.
  const current = state.phase === 'stretch' ? state.current : null;
  const startedAt = current?.startedAt;
  useEffect(() => {
    if (!current) return;
    const now = performance.now();
    const timers: number[] = [];
    const end = current.startedAt + current.seconds * 1000;
    timers.push(
      window.setTimeout(() => {
        player.play('bell');
        buzz('bell');
        dispatch({ type: 'bell' });
      }, end - now),
    );
    if (current.probeAtSeconds !== null && !current.probePlayed) {
      timers.push(
        window.setTimeout(() => {
          player.play('tick');
          dispatch({ type: 'probePlayed' });
        }, current.startedAt + current.probeAtSeconds * 1000 - now),
      );
    }
    return () => timers.forEach((id) => window.clearTimeout(id));
    // Keyed on the stretch itself, not on taps inside it.
  }, [startedAt, player]); // eslint-disable-line react-hooks/exhaustive-deps

  // The short rest after an answer, then the next tok.
  useEffect(() => {
    if (state.phase !== 'rest') return;
    const id = window.setTimeout(startStretch, REST_SECONDS * 1000);
    return () => window.clearTimeout(id);
  }, [state.phase, state.stretches.length, startStretch]);

  // Leaving the page pauses. The stretch in progress is not counted.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') dispatch({ type: 'hide' });
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // Save after every answer, so leaving at any point keeps what was done.
  useEffect(() => {
    const record = toRecord(state, meta);
    if (record) optionsRef.current.onSave(record);
  }, [state.stretches, state.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (state.phase === 'done') void lock.release();
  }, [state.phase, lock]);

  const resume = useCallback(async () => {
    await wake();
    startStretch();
  }, [wake, startStretch]);

  const answer = useCallback((stayed: boolean) => dispatch({ type: 'answer', stayed }), []);
  const tap = useCallback(() => dispatch({ type: 'tap' }), []);
  const end = useCallback(() => dispatch({ type: 'end' }), []);
  const progress = useCallback(() => {
    const c = stateRef.current.current;
    if (!c) return stateRef.current.phase === 'ask' ? 1 : 0;
    return stretchElapsed(c, performance.now()) / c.seconds;
  }, []);

  return { state, id: meta.id, begin, resume, answer, tap, end, progress };
}
