import { BitPlayback } from './playback.ts';
import type { EndEvent, Kind, RunResult, StartEvent } from './protocol.ts';
import { ApiError, fetchRun, streamRun } from './run-client.ts';

/**
 * One run of any exercise, outside React: starts it on the server, reads its stream and plays the bits
 * back in real time. Whoever draws calls `frame` once per animation frame. React reads `getSnapshot`,
 * which changes when the phase changes and about ten times a second while bits are shown.
 */

export type RunPhase = 'idle' | 'starting' | 'running' | 'done' | 'stopped' | 'error';

export interface RunSnapshot {
  phase: RunPhase;
  start: StartEvent | null;
  /** Bits on screen and their running deviation. Always a real prefix of the run's bits. */
  n: number;
  deviation: number;
  /** The server's end event, once every bit has been shown. */
  end: EndEvent | null;
  /** For a stopped run: who stopped it, and the run as the server saved it once it arrives. */
  stoppedBy: 'you' | 'connection' | null;
  saved: RunResult | null;
  /** Why a run could not start: the server's error code, or 'network'. */
  error: string | null;
}

export interface FrameResult {
  n: number;
  deviation: number;
  /** Bits that became visible this frame, oldest first. */
  newBits: number[];
}

export interface RunSessionDeps {
  kind: Kind;
  getDeviceId: () => Promise<string>;
  stream?: typeof streamRun;
  fetchRun?: typeof fetchRun;
  /** Pause between tries when asking for a stopped run's saved result. */
  wait?: (ms: number) => Promise<void>;
}

const IDLE: RunSnapshot = {
  phase: 'idle',
  start: null,
  n: 0,
  deviation: 0,
  end: null,
  stoppedBy: null,
  saved: null,
  error: null,
};

/** Snapshot updates while bits are shown, at most this often (ms). The canvas moves every frame anyway. */
const SNAPSHOT_EVERY_MS = 100;

export class RunSession {
  private snapshot: RunSnapshot = IDLE;
  private readonly listeners = new Set<() => void>();
  private playback: BitPlayback | null = null;
  private controller: AbortController | null = null;
  private pendingEnd: EndEvent | null = null;
  private lastEmit = 0;
  private shown: FrameResult = { n: 0, deviation: 0, newBits: [] };

  constructor(private readonly deps: RunSessionDeps) {}

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): RunSnapshot => this.snapshot;

  private set(patch: Partial<RunSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch };
    for (const listener of this.listeners) listener();
  }

  get active(): boolean {
    return this.snapshot.phase === 'starting' || this.snapshot.phase === 'running';
  }

  async begin(): Promise<void> {
    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;
    this.playback = null;
    this.pendingEnd = null;
    this.shown = { n: 0, deviation: 0, newBits: [] };
    this.set({ ...IDLE, phase: 'starting' });
    const stream = this.deps.stream ?? streamRun;
    let started = false;
    try {
      const deviceId = await this.deps.getDeviceId();
      await stream(
        { deviceId, kind: this.deps.kind },
        {
          onStart: (start) => {
            started = true;
            this.playback = new BitPlayback(start.bitsPerSecond);
            this.set({ phase: 'running', start });
          },
          onBits: (batch) => this.playback?.push(batch.bits, performance.now()),
          onEnd: (end) => {
            this.pendingEnd = end;
          },
        },
        controller.signal,
      );
      if (!this.pendingEnd) throw new ApiError(0, 'stream_ended');
    } catch (error) {
      if (controller.signal.aborted || this.controller !== controller) return;
      if (started) {
        // The connection broke mid-run. The server keeps the run with the bits it had.
        this.finishStopped('connection');
      } else {
        this.set({ phase: 'error', error: error instanceof ApiError && error.code ? error.code : 'network' });
      }
    }
  }

  /** Stops early. The server keeps the run with the bits it had, and it counts. */
  stop(): void {
    if (!this.active) return;
    this.controller?.abort();
    this.finishStopped('you');
  }

  private finishStopped(by: 'you' | 'connection'): void {
    const shown = this.playback?.flush();
    this.set({
      phase: 'stopped',
      stoppedBy: by,
      ...(shown ? { n: shown.n, deviation: shown.deviation } : {}),
    });
    const runId = this.snapshot.start?.runId;
    if (runId) void this.loadSaved(runId, this.controller);
  }

  /** The server saves a stopped run a moment after the connection closes. Ask a few times. */
  private async loadSaved(runId: string, controller: AbortController | null): Promise<void> {
    const load = this.deps.fetchRun ?? fetchRun;
    const wait = this.deps.wait ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
    for (let attempt = 0; attempt < 6; attempt++) {
      await wait(400);
      if (this.controller !== controller) return;
      try {
        const saved = await load(runId);
        if (saved.status !== 'running') {
          if (this.controller === controller) this.set({ saved });
          return;
        }
      } catch {
        // Try again.
      }
    }
  }

  /** Moves the playback to `now` and returns what is on screen. Call once per animation frame. */
  frame(now: number): FrameResult {
    if (this.snapshot.phase !== 'running' || !this.playback) {
      this.shown = { n: this.snapshot.n, deviation: this.snapshot.deviation, newBits: [] };
      return this.shown;
    }
    this.shown = this.playback.advance(now);
    const end = this.pendingEnd;
    if (end && this.shown.n >= end.n) {
      this.set({ phase: 'done', end, n: this.shown.n, deviation: this.shown.deviation });
    } else if (now - this.lastEmit >= SNAPSHOT_EVERY_MS && this.shown.n !== this.snapshot.n) {
      this.lastEmit = now;
      this.set({ n: this.shown.n, deviation: this.shown.deviation });
    }
    return this.shown;
  }

  /** Ends any run in progress. Listeners stay, so React's development double mount keeps working. */
  dispose(): void {
    this.controller?.abort();
    this.controller = null;
  }
}
