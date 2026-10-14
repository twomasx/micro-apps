import { DEFAULT_VOLUME, clampBeat } from './frequencies';
import type { NoiseKind } from './noise';
import { findPreset } from './presets';

export type Mode = 'prime' | 'session';
/** The selection when the beat rate is the user's own. */
export const CUSTOM = 'custom';

/** What the player remembers on this device between visits. */
export interface Settings {
  /** A preset id, or 'custom'. */
  selection: string;
  customBeat: number;
  mode: Mode;
  sessionMinutes: number;
  primeMinutes: number;
  volume: number;
  noise: NoiseKind | null;
  noiseVolume: number;
  /** The first-visit screen has been answered. */
  introSeen: boolean;
  /** A session has been started on this device at least once. */
  hasPlayed: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  selection: 'focus',
  customBeat: 12,
  mode: 'prime',
  sessionMinutes: 10,
  primeMinutes: 10,
  volume: DEFAULT_VOLUME,
  noise: null,
  noiseVolume: DEFAULT_VOLUME,
  introSeen: false,
  hasPlayed: false,
};

const unit = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;
const minutes = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;

/** Turns whatever was in storage into valid settings. Unknown or broken fields fall back to the defaults. */
export function sanitizeSettings(raw: unknown): Settings {
  if (typeof raw !== 'object' || raw === null) return DEFAULT_SETTINGS;
  const saved = raw as Record<string, unknown>;
  const d = DEFAULT_SETTINGS;
  const selection =
    typeof saved.selection === 'string' && (saved.selection === CUSTOM || findPreset(saved.selection))
      ? saved.selection
      : d.selection;
  return {
    selection,
    customBeat: typeof saved.customBeat === 'number' ? clampBeat(saved.customBeat) : d.customBeat,
    mode: saved.mode === 'session' || saved.mode === 'prime' ? saved.mode : d.mode,
    sessionMinutes: minutes(saved.sessionMinutes, d.sessionMinutes),
    primeMinutes: minutes(saved.primeMinutes, d.primeMinutes),
    volume: unit(saved.volume, d.volume),
    noise: saved.noise === 'pink' || saved.noise === 'brown' ? saved.noise : null,
    noiseVolume: unit(saved.noiseVolume, d.noiseVolume),
    introSeen: saved.introSeen === true,
    hasPlayed: saved.hasPlayed === true,
  };
}
