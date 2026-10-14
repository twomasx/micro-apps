import { customTone, type Tone } from './frequencies';
import { canUseCustomBeat, canUseNoise, playbackLimit, type PlaybackLimit } from './limits';
import type { NoiseKind } from './noise';
import { findPreset, type Preset } from './presets';
import { CUSTOM, DEFAULT_SETTINGS, type Mode, type Settings } from './settings';
import { createTimer, isComplete, pauseTimer, startTimer, type SessionTimer } from './timer';

/**
 * The player as plain data and one pure function. No audio and no React in here:
 * the controller turns state changes into sound, the components draw the state.
 */
export type Status = 'idle' | 'playing' | 'paused' | 'complete';
export type CompletedKind = Mode | 'preview';

export interface PlayerState {
  settings: Settings;
  /** False until the saved settings have been read from this device. */
  ready: boolean;
  /** The lifetime unlock is confirmed for this device. */
  unlocked: boolean;
  status: Status;
  timer: SessionTimer;
  /** The current timer is the 60 second preview of a locked preset. */
  preview: boolean;
  /** What just finished, while status is 'complete'. */
  completed: CompletedKind | null;
  /** Set when the browser refused to start the sound. */
  error: string | null;
  /** The time of the last update, for drawing the clock. */
  now: number;
}

export type PlayerAction =
  | { type: 'hydrate'; settings: Settings }
  | { type: 'setUnlocked'; unlocked: boolean }
  | { type: 'select'; id: string }
  | { type: 'customBeat'; beat: number }
  | { type: 'mode'; mode: Mode }
  /** Sets the length for the current mode. */
  | { type: 'minutes'; minutes: number }
  | { type: 'volume'; volume: number }
  | { type: 'noise'; kind: NoiseKind | null }
  | { type: 'noiseVolume'; volume: number }
  | { type: 'introSeen' }
  | { type: 'play' }
  | { type: 'pause' }
  | { type: 'toggle' }
  | { type: 'tick' }
  | { type: 'failed'; message: string }
  /** Leaves the "complete" screen. */
  | { type: 'dismiss' };

/** The selected preset, or null when the beat rate is custom. */
export function selectedPreset(state: PlayerState): Preset | null {
  return state.settings.selection === CUSTOM ? null : (findPreset(state.settings.selection) ?? null);
}

export function toneOf(state: PlayerState): Tone {
  const preset = selectedPreset(state);
  return preset ? { carrier: preset.carrier, beat: preset.beat } : customTone(state.settings.customBeat);
}

/** The noise layer is part of the unlock, so a free user never hears a saved setting. */
export function noiseOf(state: PlayerState): NoiseKind | null {
  return canUseNoise(state.unlocked) ? state.settings.noise : null;
}

export function limitOf(state: Pick<PlayerState, 'settings' | 'unlocked'>): PlaybackLimit {
  const { settings, unlocked } = state;
  const preset = settings.selection === CUSTOM ? { free: false } : (findPreset(settings.selection) ?? { free: true });
  const prime = settings.mode === 'prime';
  return playbackLimit(preset, prime ? settings.primeMinutes : settings.sessionMinutes, unlocked, prime);
}

export function createPlayerState(now: number, settings: Settings = DEFAULT_SETTINGS, unlocked = false): PlayerState {
  const limit = limitOf({ settings, unlocked });
  return {
    settings,
    ready: false,
    unlocked,
    status: 'idle',
    timer: createTimer(limit.durationMs),
    preview: limit.preview,
    completed: null,
    error: null,
    now,
  };
}

/** A new timer for the current limit. A playing session keeps playing, from the start of the new timer. */
function retime(state: PlayerState, now: number): PlayerState {
  const limit = limitOf(state);
  const timer = createTimer(limit.durationMs);
  const playing = state.status === 'playing';
  return {
    ...state,
    timer: playing ? startTimer(timer, now) : timer,
    preview: limit.preview,
    status: playing ? 'playing' : 'idle',
    completed: null,
  };
}

/**
 * After a setting changed: keep the running session if its length and kind still fit,
 * otherwise start a new timer.
 */
function refit(state: PlayerState, now: number): PlayerState {
  const limit = limitOf(state);
  const fits = limit.durationMs === state.timer.durationMs && limit.preview === state.preview;
  return fits && state.status !== 'complete' ? state : retime(state, now);
}

function withSettings(state: PlayerState, patch: Partial<Settings>): PlayerState {
  return { ...state, settings: { ...state.settings, ...patch } };
}

function play(state: PlayerState, now: number): PlayerState {
  if (state.status === 'playing') return state;
  const fresh = state.status === 'complete' || isComplete(state.timer, now) ? retime({ ...state, status: 'idle' }, now) : state;
  return {
    ...withSettings(fresh, { hasPlayed: true }),
    status: 'playing',
    timer: startTimer(fresh.timer, now),
    completed: null,
    error: null,
  };
}

function pause(state: PlayerState, now: number): PlayerState {
  if (state.status !== 'playing') return state;
  return { ...state, status: 'paused', timer: pauseTimer(state.timer, now) };
}

export function reducePlayer(previous: PlayerState, action: PlayerAction, now: number): PlayerState {
  const state = { ...previous, now };
  switch (action.type) {
    case 'hydrate':
      return refit({ ...state, settings: action.settings, ready: true }, now);
    case 'setUnlocked':
      return refit({ ...state, unlocked: action.unlocked }, now);
    case 'select': {
      if (action.id === CUSTOM ? !canUseCustomBeat(state.unlocked) : !findPreset(action.id)) return state;
      return refit(withSettings(state, { selection: action.id }), now);
    }
    case 'customBeat': {
      if (!canUseCustomBeat(state.unlocked)) return state;
      return refit(withSettings(state, { selection: CUSTOM, customBeat: customTone(action.beat).beat }), now);
    }
    case 'mode':
      return refit(withSettings(state, { mode: action.mode }), now);
    case 'minutes':
      return refit(
        withSettings(
          state,
          state.settings.mode === 'prime' ? { primeMinutes: action.minutes } : { sessionMinutes: action.minutes },
        ),
        now,
      );
    case 'volume':
      return withSettings(state, { volume: Math.min(1, Math.max(0, action.volume)) });
    case 'noise':
      return canUseNoise(state.unlocked) ? withSettings(state, { noise: action.kind }) : state;
    case 'noiseVolume':
      return withSettings(state, { noiseVolume: Math.min(1, Math.max(0, action.volume)) });
    case 'introSeen':
      return withSettings(state, { introSeen: true });
    case 'play':
      return play(state, now);
    case 'pause':
      return pause(state, now);
    case 'toggle':
      return state.status === 'playing' ? pause(state, now) : play(state, now);
    case 'tick': {
      if (state.status !== 'playing' || !isComplete(state.timer, now)) return state;
      return {
        ...state,
        status: 'complete',
        timer: pauseTimer(state.timer, now),
        completed: state.preview ? 'preview' : state.settings.mode,
      };
    }
    case 'failed':
      return { ...pause(state, now), error: action.message };
    case 'dismiss':
      return state.status === 'complete' ? retime({ ...state, status: 'idle' }, now) : state;
  }
}
