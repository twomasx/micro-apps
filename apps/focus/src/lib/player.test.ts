import { describe, expect, it } from 'vitest';
import {
  createPlayerState,
  limitOf,
  noiseOf,
  reducePlayer,
  selectedPreset,
  toneOf,
  type PlayerAction,
  type PlayerState,
} from './player';
import { DEFAULT_SETTINGS, sanitizeSettings, type Settings } from './settings';
import { elapsedMs, remainingMs } from './timer';

const MINUTE = 60_000;
const T0 = 1_760_000_000_000;

const settings = (patch: Partial<Settings> = {}): Settings => ({ ...DEFAULT_SETTINGS, mode: 'session', ...patch });
const start = (patch: Partial<Settings> = {}, unlocked = false) => createPlayerState(T0, settings(patch), unlocked);
/** Applies actions in order. A number moves the clock forward by that many milliseconds. */
function run(state: PlayerState, ...steps: (PlayerAction | number)[]): PlayerState {
  let now = state.now;
  for (const step of steps) {
    if (typeof step === 'number') now += step;
    else state = reducePlayer(state, step, now);
  }
  return state;
}

describe('a new player', () => {
  it('opens on Focus in Prime mode at 10 minutes, idle', () => {
    const state = createPlayerState(T0);
    expect(selectedPreset(state)?.id).toBe('focus');
    expect(state.settings.mode).toBe('prime');
    expect(state.status).toBe('idle');
    expect(state.timer.durationMs).toBe(10 * MINUTE);
    expect(toneOf(state)).toEqual({ carrier: 350, beat: 18 });
  });
});

describe('play and pause', () => {
  it('counts only while playing', () => {
    const state = run(start(), { type: 'play' }, 2 * MINUTE, { type: 'pause' }, 30 * MINUTE, { type: 'play' }, MINUTE, { type: 'tick' });
    expect(state.status).toBe('playing');
    expect(elapsedMs(state.timer, state.now)).toBe(3 * MINUTE);
  });

  it('remembers that a session was started', () => {
    expect(start().settings.hasPlayed).toBe(false);
    expect(run(start(), { type: 'play' }).settings.hasPlayed).toBe(true);
  });

  it('toggles', () => {
    expect(run(start(), { type: 'toggle' }).status).toBe('playing');
    expect(run(start(), { type: 'toggle' }, 1000, { type: 'toggle' }).status).toBe('paused');
  });

  it('pauses and keeps the message when the browser refuses to start the sound', () => {
    const state = run(start(), { type: 'play' }, { type: 'failed', message: 'not allowed' });
    expect(state.status).toBe('paused');
    expect(state.error).toBe('not allowed');
    expect(run(state, { type: 'play' }).error).toBeNull();
  });
});

describe('the end of a session', () => {
  it('completes a session when its time is up, even if one tick arrives very late', () => {
    const state = run(start({ sessionMinutes: 5 }), { type: 'play' }, 47 * MINUTE, { type: 'tick' });
    expect(state.status).toBe('complete');
    expect(state.completed).toBe('session');
    expect(remainingMs(state.timer, state.now)).toBe(0);
  });

  it('completes Prime mode as a prime', () => {
    const state = run(start({ mode: 'prime' }), { type: 'play' }, 10 * MINUTE, { type: 'tick' });
    expect(state.completed).toBe('prime');
  });

  it('starts a fresh session when play is pressed after the end', () => {
    const state = run(start({ sessionMinutes: 5 }), { type: 'play' }, 5 * MINUTE, { type: 'tick' }, MINUTE, { type: 'play' });
    expect(state.status).toBe('playing');
    expect(state.completed).toBeNull();
    expect(remainingMs(state.timer, state.now)).toBe(5 * MINUTE);
  });

  it('goes back to idle when the end screen is dismissed', () => {
    const state = run(start({ sessionMinutes: 5 }), { type: 'play' }, 5 * MINUTE, { type: 'tick' }, { type: 'dismiss' });
    expect(state.status).toBe('idle');
    expect(remainingMs(state.timer, state.now)).toBe(5 * MINUTE);
  });
});

describe('changing preset', () => {
  it('keeps the session running when both presets are free', () => {
    const state = run(start(), { type: 'play' }, 3 * MINUTE, { type: 'select', id: 'calm' }, { type: 'tick' });
    expect(state.status).toBe('playing');
    expect(elapsedMs(state.timer, state.now)).toBe(3 * MINUTE);
    expect(toneOf(state)).toEqual({ carrier: 300, beat: 6 });
  });

  it('ignores an unknown preset', () => {
    expect(run(start(), { type: 'select', id: 'nope' }).settings.selection).toBe('focus');
  });
});

describe('free tier', () => {
  it('caps a session at 10 minutes and Prime mode at 10 minutes', () => {
    expect(limitOf(start({ sessionMinutes: 90 }))).toEqual({ durationMs: 10 * MINUTE, preview: false });
    expect(limitOf(start({ mode: 'prime', primeMinutes: 20 }))).toEqual({ durationMs: 10 * MINUTE, preview: false });
  });

  it('plays a locked preset as a 60 second preview and then says so', () => {
    const state = run(start(), { type: 'select', id: 'deep' }, { type: 'play' });
    expect(state.preview).toBe(true);
    expect(remainingMs(state.timer, state.now)).toBe(60_000);
    const done = run(state, 60_000, { type: 'tick' });
    expect(done.status).toBe('complete');
    expect(done.completed).toBe('preview');
  });

  it('turns a running session into a preview when a locked preset is picked, and keeps playing', () => {
    const state = run(start(), { type: 'play' }, 3 * MINUTE, { type: 'select', id: 'relaxed' });
    expect(state.status).toBe('playing');
    expect(state.preview).toBe(true);
    expect(remainingMs(state.timer, state.now)).toBe(60_000);
  });

  it('gives the full session back when a free preset is picked during a preview', () => {
    const state = run(start(), { type: 'select', id: 'deep' }, { type: 'play' }, 20_000, { type: 'select', id: 'sleep' });
    expect(state.preview).toBe(false);
    expect(state.status).toBe('playing');
    expect(remainingMs(state.timer, state.now)).toBe(10 * MINUTE);
  });

  it('has no custom beat and no noise layer', () => {
    const state = run(start(), { type: 'customBeat', beat: 12 }, { type: 'select', id: 'custom' }, { type: 'noise', kind: 'pink' });
    expect(state.settings.selection).toBe('focus');
    expect(state.settings.noise).toBeNull();
  });

  it('does not play a noise setting saved while unlocked', () => {
    expect(noiseOf(start({ noise: 'brown' }, false))).toBeNull();
    expect(noiseOf(start({ noise: 'brown' }, true))).toBe('brown');
  });
});

describe('lifetime unlock', () => {
  it('plays every preset at the chosen length, up to 90 minutes', () => {
    const state = run(start({ sessionMinutes: 90 }, true), { type: 'select', id: 'deep' }, { type: 'play' });
    expect(state.preview).toBe(false);
    expect(remainingMs(state.timer, state.now)).toBe(90 * MINUTE);
  });

  it('allows Prime mode at 20 minutes', () => {
    const state = run(start({}, true), { type: 'mode', mode: 'prime' }, { type: 'minutes', minutes: 20 });
    expect(state.settings.primeMinutes).toBe(20);
    expect(state.timer.durationMs).toBe(20 * MINUTE);
  });

  it('plays a custom beat rate on a 300 Hz carrier, clamped to 1 to 40 Hz', () => {
    const state = run(start({}, true), { type: 'customBeat', beat: 55 });
    expect(selectedPreset(state)).toBeNull();
    expect(toneOf(state)).toEqual({ carrier: 300, beat: 40 });
    expect(limitOf(state).preview).toBe(false);
  });

  it('ends a preview and gives the full session when the unlock arrives', () => {
    const state = run(start(), { type: 'select', id: 'deep' }, { type: 'play' }, 10_000, { type: 'setUnlocked', unlocked: true });
    expect(state.preview).toBe(false);
    expect(state.status).toBe('playing');
    expect(remainingMs(state.timer, state.now)).toBe(10 * MINUTE);
  });
});

describe('changing length or mode', () => {
  it('sets the length for the current mode only', () => {
    const state = run(start({}, true), { type: 'minutes', minutes: 30 });
    expect(state.settings.sessionMinutes).toBe(30);
    expect(state.settings.primeMinutes).toBe(10);
  });

  it('restarts the timer and keeps playing', () => {
    const state = run(start(), { type: 'play' }, 4 * MINUTE, { type: 'minutes', minutes: 5 });
    expect(state.status).toBe('playing');
    expect(remainingMs(state.timer, state.now)).toBe(5 * MINUTE);
  });

  it('keeps the timer when the new mode has the same length', () => {
    const state = run(start(), { type: 'play' }, 4 * MINUTE, { type: 'mode', mode: 'prime' }, { type: 'tick' });
    expect(elapsedMs(state.timer, state.now)).toBe(4 * MINUTE);
  });
});

describe('volume', () => {
  it('stays between 0 and 1', () => {
    expect(run(start(), { type: 'volume', volume: 3 }).settings.volume).toBe(1);
    expect(run(start(), { type: 'volume', volume: -1 }).settings.volume).toBe(0);
  });
});

describe('saved settings', () => {
  it('falls back to the defaults for missing or broken data', () => {
    expect(sanitizeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings('x')).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings({ selection: 'gone', volume: 'loud', mode: 3, noise: 'white' })).toEqual(DEFAULT_SETTINGS);
  });

  it('keeps valid values and clamps the rest', () => {
    const saved = sanitizeSettings({ selection: 'calm', volume: 7, customBeat: 99, mode: 'session', sessionMinutes: 45, noise: 'pink', introSeen: true });
    expect(saved).toMatchObject({ selection: 'calm', volume: 1, customBeat: 40, mode: 'session', sessionMinutes: 45, noise: 'pink', introSeen: true, hasPlayed: false });
  });

  it('applies loaded settings to an idle player', () => {
    const state = run(createPlayerState(T0), { type: 'hydrate', settings: settings({ selection: 'sleep', sessionMinutes: 5 }) });
    expect(selectedPreset(state)?.id).toBe('sleep');
    expect(state.timer.durationMs).toBe(5 * MINUTE);
  });
});
