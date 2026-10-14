import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPlayerController, type PlayerEngine } from './player-controller';
import { DEFAULT_SETTINGS, type Settings } from './settings';

const T0 = 1_760_000_000_000;

function setup(options: { unlocked?: boolean; settings?: Partial<Settings>; failPlay?: boolean } = {}) {
  const calls: string[] = [];
  const engine: PlayerEngine = {
    play: (o) => {
      calls.push(`play ${o?.remainingMs}`);
      return options.failPlay ? Promise.reject(new Error('blocked')) : Promise.resolve();
    },
    pause: () => void calls.push('pause'),
    setTone: (t) => void calls.push(`tone ${t.carrier}+${t.beat}`),
    setVolume: (v) => void calls.push(`volume ${v}`),
    setNoise: (k) => void calls.push(`noise ${k}`),
    setNoiseVolume: (v) => void calls.push(`noiseVolume ${v}`),
  };
  const saved: Settings[] = [];
  const controller = createPlayerController({
    engine,
    now: () => Date.now(),
    settings: { ...DEFAULT_SETTINGS, mode: 'session', ...options.settings },
    unlocked: options.unlocked,
    onSettings: (s) => saved.push(s),
  });
  return { controller, calls, saved };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(T0);
});
afterEach(() => {
  vi.useRealTimers();
});

describe('player controller', () => {
  it('sends the tone, volume and noise to the engine, then plays with the time left', () => {
    const { controller, calls } = setup();
    controller.dispatch({ type: 'play' });
    expect(calls).toEqual(['tone 350+18', 'volume 0.3', 'noise null', 'noiseVolume 0.3', 'play 600000']);
  });

  it('glides to a new preset without restarting the sound', () => {
    const { controller, calls } = setup();
    controller.dispatch({ type: 'play' });
    calls.length = 0;
    controller.dispatch({ type: 'select', id: 'calm' });
    expect(calls).toEqual(['tone 300+6']);
  });

  it('passes volume changes on', () => {
    const { controller, calls } = setup();
    controller.dispatch({ type: 'volume', volume: 0.5 });
    expect(calls).toEqual(['volume 0.5']);
  });

  it('pauses the engine and resumes with the time that is left', () => {
    const { controller, calls } = setup();
    controller.dispatch({ type: 'play' });
    vi.advanceTimersByTime(120_000);
    controller.dispatch({ type: 'pause' });
    expect(calls.at(-1)).toBe('pause');
    vi.advanceTimersByTime(500_000);
    controller.dispatch({ type: 'play' });
    expect(calls.at(-1)).toBe('play 480000');
  });

  it('completes the session by itself and pauses the engine', () => {
    const { controller, calls } = setup({ settings: { sessionMinutes: 5 } });
    controller.dispatch({ type: 'play' });
    vi.advanceTimersByTime(5 * 60_000 + 300);
    expect(controller.getState().status).toBe('complete');
    expect(calls.at(-1)).toBe('pause');
  });

  it('schedules a 60 second end when a locked preset is picked during a free session', () => {
    const { controller, calls } = setup();
    controller.dispatch({ type: 'play' });
    controller.dispatch({ type: 'select', id: 'deep' });
    expect(calls.slice(-5)).toEqual(['tone 400+40', 'volume 0.3', 'noise null', 'noiseVolume 0.3', 'play 60000']);
    vi.advanceTimersByTime(60_300);
    expect(controller.getState().completed).toBe('preview');
  });

  it('plays the noise layer only when unlocked', () => {
    const free = setup({ settings: { noise: 'pink' } });
    free.controller.dispatch({ type: 'play' });
    expect(free.calls).toContain('noise null');

    const paid = setup({ settings: { noise: 'pink' }, unlocked: true });
    paid.controller.dispatch({ type: 'play' });
    expect(paid.calls).toContain('noise pink');
    paid.controller.dispatch({ type: 'noise', kind: 'brown' });
    expect(paid.calls.at(-1)).toBe('noise brown');
  });

  it('reports settings to save only when they change', () => {
    const { controller, saved } = setup();
    controller.dispatch({ type: 'select', id: 'sleep' });
    controller.dispatch({ type: 'tick' });
    controller.dispatch({ type: 'tick' });
    expect(saved).toHaveLength(1);
    expect(saved[0]?.selection).toBe('sleep');
  });

  it('pauses and shows the reason when the browser refuses to play', async () => {
    const { controller } = setup({ failPlay: true });
    controller.dispatch({ type: 'play' });
    await vi.advanceTimersByTimeAsync(0);
    expect(controller.getState().status).toBe('paused');
    expect(controller.getState().error).toBe('blocked');
  });

  it('tells subscribers about every change and stops after unsubscribe', () => {
    const { controller } = setup();
    const listener = vi.fn();
    const unsubscribe = controller.subscribe(listener);
    controller.dispatch({ type: 'volume', volume: 0.4 });
    unsubscribe();
    controller.dispatch({ type: 'volume', volume: 0.6 });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
