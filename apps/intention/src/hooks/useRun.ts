import { useCallback, useEffect, useRef, useState } from 'react';
import { getDeviceId } from '../lib/device.ts';
import { BitPlayback } from '../lib/playback.ts';
import type { EndEvent, Kind, StartEvent } from '../lib/protocol.ts';
import { ApiError, streamRun } from '../lib/run-client.ts';

export type RunPhase = 'idle' | 'starting' | 'running' | 'done' | 'error';

export interface RunView {
  phase: RunPhase;
  start: StartEvent | null;
  /** Bits on screen so far, and their running deviation. Always a real prefix of the run. */
  n: number;
  deviation: number;
  /** Bits newly shown since the last frame, for drawing specks. */
  newBits: number[];
  end: EndEvent | null;
  /** Set when the run stopped early on this device. */
  stoppedEarly: boolean;
  errorCode: string | null;
}

const IDLE: RunView = {
  phase: 'idle',
  start: null,
  n: 0,
  deviation: 0,
  newBits: [],
  end: null,
  stoppedEarly: false,
  errorCode: null,
};

/**
 * One run of any exercise: starts it on the server, reads its stream and plays the bits back in real time.
 * The view updates once per animation frame while bits are still being shown.
 */
export function useRun(kind: Kind) {
  const [view, setView] = useState<RunView>(IDLE);
  const abortRef = useRef<AbortController | null>(null);
  const frameRef = useRef(0);

  useEffect(
    () => () => {
      abortRef.current?.abort();
      cancelAnimationFrame(frameRef.current);
    },
    [],
  );

  const begin = useCallback(async () => {
    abortRef.current?.abort();
    cancelAnimationFrame(frameRef.current);
    const controller = new AbortController();
    abortRef.current = controller;
    setView({ ...IDLE, phase: 'starting' });

    let playback: BitPlayback | null = null;
    let start: StartEvent | null = null;
    let end: EndEvent | null = null;

    const frame = (now: number) => {
      if (!playback || controller.signal.aborted) return;
      const shown = playback.advance(now);
      const finished = end !== null && shown.n >= end.n;
      if (shown.newBits.length > 0 || finished) {
        setView((v) => ({
          ...v,
          n: shown.n,
          deviation: shown.deviation,
          newBits: shown.newBits,
          ...(finished ? { phase: 'done', end } : {}),
        }));
      }
      if (!finished) frameRef.current = requestAnimationFrame(frame);
    };

    try {
      const deviceId = await getDeviceId();
      await streamRun(
        { deviceId, kind },
        {
          onStart: (s) => {
            start = s;
            playback = new BitPlayback(s.bitsPerSecond);
            setView((v) => ({ ...v, phase: 'running', start: s }));
            frameRef.current = requestAnimationFrame(frame);
          },
          onBits: (batch) => playback?.push(batch.bits, performance.now()),
          onEnd: (e) => {
            end = e;
          },
        },
        controller.signal,
      );
      if (!start || !end) throw new ApiError(0, 'stream_ended');
    } catch (error) {
      if (controller.signal.aborted) return;
      cancelAnimationFrame(frameRef.current);
      setView((v) => ({ ...v, phase: 'error', errorCode: error instanceof ApiError ? error.code : 'network' }));
    }
  }, [kind]);

  /** Stops early. The server keeps the run with the bits it had, and it counts. */
  const stop = useCallback(() => {
    abortRef.current?.abort();
    cancelAnimationFrame(frameRef.current);
    setView((v) => (v.phase === 'running' || v.phase === 'starting' ? { ...v, phase: 'done', stoppedEarly: true } : v));
  }, []);

  return { view, begin, stop };
}
