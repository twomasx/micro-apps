import { describe, expect, it } from 'vitest';
import type { RunHandlers } from './run-client.ts';
import { ApiError } from './run-client.ts';
import type { RunResult, StartEvent } from './protocol.ts';
import { RunSession, type RunSessionDeps } from './run-session.ts';

const START: StartEvent = { runId: 'run0000000000001', aim: 'right', lengthBits: 100, source: 'crypto', bitsPerSecond: 200 };

/** A stream the test drives by hand. */
function handStream() {
  let handlers: RunHandlers | null = null;
  let finish: (() => void) | null = null;
  let fail: ((error: unknown) => void) | null = null;
  let signal: AbortSignal | null = null;
  const stream: NonNullable<RunSessionDeps['stream']> = (_options, h, s) => {
    handlers = h;
    signal = s;
    return new Promise<void>((resolve, reject) => {
      finish = resolve;
      fail = reject;
      s.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    });
  };
  return {
    stream,
    get handlers() {
      return handlers!;
    },
    get signal() {
      return signal!;
    },
    finish: () => finish!(),
    fail: (error: unknown) => fail!(error),
  };
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

function session(extra: Partial<RunSessionDeps> = {}) {
  const hand = handStream();
  const s = new RunSession({
    kind: 'tug',
    getDeviceId: () => Promise.resolve('device0000000001'),
    stream: hand.stream,
    wait: () => Promise.resolve(),
    ...extra,
  });
  return { s, hand };
}

describe('a run session', () => {
  it('goes from starting to running to done once every bit is shown', async () => {
    const { s, hand } = session();
    const begun = s.begin();
    expect(s.getSnapshot().phase).toBe('starting');
    await tick();
    hand.handlers.onStart(START);
    expect(s.getSnapshot()).toMatchObject({ phase: 'running', start: START });

    const t = performance.now();
    hand.handlers.onBits({ bits: '1'.repeat(50), n: 50, deviation: 50 });
    hand.handlers.onBits({ bits: '0'.repeat(50), n: 100, deviation: 0 });
    hand.handlers.onEnd({ status: 'complete', n: 100, deviation: 0, z: 0 });
    hand.finish();
    await begun;

    // Half the bits are due after 245 ms; the run is not done until all are shown.
    const mid = s.frame(t + 245);
    expect(mid.n).toBeLessThan(100);
    expect(s.getSnapshot().phase).toBe('running');
    const last = s.frame(t + 10_000);
    expect(last).toMatchObject({ n: 100, deviation: 0 });
    expect(s.getSnapshot()).toMatchObject({ phase: 'done', n: 100, end: { z: 0 } });
  });

  it('stopping early aborts the stream and loads the saved run', async () => {
    const saved = { runId: START.runId, status: 'abandoned', n: 50, z: 0.79 } as RunResult;
    const { s, hand } = session({ fetchRun: () => Promise.resolve(saved) });
    const begun = s.begin();
    await tick();
    hand.handlers.onStart(START);
    hand.handlers.onBits({ bits: '1'.repeat(50), n: 50, deviation: 50 });
    s.stop();
    expect(hand.signal.aborted).toBe(true);
    await begun;
    expect(s.getSnapshot()).toMatchObject({ phase: 'stopped', stoppedBy: 'you', n: 50, deviation: 50 });
    await tick();
    await tick();
    expect(s.getSnapshot().saved).toEqual(saved);
  });

  it('a broken connection mid-run counts as stopped by the connection', async () => {
    const { s, hand } = session({ fetchRun: () => Promise.reject(new Error('offline')) });
    const begun = s.begin();
    await tick();
    hand.handlers.onStart(START);
    hand.fail(new TypeError('network'));
    await begun;
    expect(s.getSnapshot()).toMatchObject({ phase: 'stopped', stoppedBy: 'connection' });
  });

  it('a run that cannot start reports why', async () => {
    const { s, hand } = session();
    const begun = s.begin();
    await tick();
    hand.fail(new ApiError(429, 'daily_limit'));
    await begun;
    expect(s.getSnapshot()).toMatchObject({ phase: 'error', error: 'daily_limit' });
  });

  it('a stream that ends without an end event is a broken connection', async () => {
    const { s, hand } = session({ fetchRun: () => Promise.reject(new Error('offline')) });
    const begun = s.begin();
    await tick();
    hand.handlers.onStart(START);
    hand.finish();
    await begun;
    expect(s.getSnapshot()).toMatchObject({ phase: 'stopped', stoppedBy: 'connection' });
  });
});
