import type { AudioEngine } from './audio';
import {
  createPlayerState,
  noiseOf,
  reducePlayer,
  toneOf,
  type PlayerAction,
  type PlayerState,
} from './player';
import type { Settings } from './settings';
import { remainingMs } from './timer';

/** How often the clock is redrawn while playing. The timer itself reads real time. */
const TICK_MS = 250;

export type PlayerEngine = Pick<
  AudioEngine,
  'play' | 'pause' | 'setTone' | 'setVolume' | 'setNoise' | 'setNoiseVolume'
>;

export interface PlayerControllerOptions {
  engine: PlayerEngine;
  now?: () => number;
  settings?: Settings;
  unlocked?: boolean;
  /** Called when the remembered settings change, so they can be saved. */
  onSettings?: (settings: Settings) => void;
  /** Called on every change that is more than the clock moving on. */
  onChange?: (state: PlayerState) => void;
}

export interface PlayerController {
  getState(): PlayerState;
  subscribe(listener: () => void): () => void;
  dispatch(action: PlayerAction): void;
  destroy(): void;
}

/** Holds the player state and turns each change into calls on the audio engine. */
export function createPlayerController(options: PlayerControllerOptions): PlayerController {
  const { engine } = options;
  const now = options.now ?? Date.now;
  const listeners = new Set<() => void>();
  let state = createPlayerState(now(), options.settings, options.unlocked);
  let ticker: ReturnType<typeof setInterval> | undefined;

  function startSound(next: PlayerState) {
    engine.setTone(toneOf(next));
    engine.setVolume(next.settings.volume);
    engine.setNoise(noiseOf(next));
    engine.setNoiseVolume(next.settings.noiseVolume);
    engine.play({ remainingMs: remainingMs(next.timer, next.now) }).catch((error: unknown) => {
      dispatch({ type: 'failed', message: error instanceof Error ? error.message : String(error) });
    });
  }

  function sync(previous: PlayerState, next: PlayerState) {
    const wasPlaying = previous.status === 'playing';
    const isPlaying = next.status === 'playing';

    if (isPlaying && (!wasPlaying || previous.timer !== next.timer)) {
      startSound(next);
    } else {
      const before = toneOf(previous);
      const after = toneOf(next);
      if (before.carrier !== after.carrier || before.beat !== after.beat) engine.setTone(after);
      if (previous.settings.volume !== next.settings.volume) engine.setVolume(next.settings.volume);
      if (noiseOf(previous) !== noiseOf(next)) engine.setNoise(noiseOf(next));
      if (previous.settings.noiseVolume !== next.settings.noiseVolume) {
        engine.setNoiseVolume(next.settings.noiseVolume);
      }
    }
    if (wasPlaying && !isPlaying) engine.pause();

    if (isPlaying && ticker === undefined) {
      ticker = setInterval(() => dispatch({ type: 'tick' }), TICK_MS);
    } else if (!isPlaying && ticker !== undefined) {
      clearInterval(ticker);
      ticker = undefined;
    }
  }

  function dispatch(action: PlayerAction) {
    const previous = state;
    const next = reducePlayer(previous, action, now());
    state = next;
    sync(previous, next);
    if (previous.settings !== next.settings) options.onSettings?.(next.settings);
    if (isMoreThanTheClock(previous, next)) options.onChange?.(next);
    for (const listener of listeners) listener();
  }

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispatch,
    destroy() {
      clearInterval(ticker);
      ticker = undefined;
      listeners.clear();
    },
  };
}

function isMoreThanTheClock(a: PlayerState, b: PlayerState): boolean {
  return (
    a.settings !== b.settings ||
    a.ready !== b.ready ||
    a.status !== b.status ||
    a.timer !== b.timer ||
    a.unlocked !== b.unlocked ||
    a.error !== b.error
  );
}
