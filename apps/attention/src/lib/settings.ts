import { FREE_SIZE, isSessionSize, type SessionSize } from './limits';

/** What the app remembers on this device between visits. */
export interface Settings {
  /** 0 to 1. One volume for the tok, the bell and the tick. */
  volume: number;
  /** Experimental tick probes during stretches. */
  probes: boolean;
  size: SessionSize;
  /** The first-session instructions have been read. */
  introSeen: boolean;
  /** The 18-digit practice round has been done once. */
  practiceDone: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  volume: 0.8,
  probes: true,
  size: FREE_SIZE,
  introSeen: false,
  practiceDone: false,
};

/** Turns whatever was in storage into valid settings. Broken fields fall back to the defaults. */
export function sanitizeSettings(raw: unknown): Settings {
  if (typeof raw !== 'object' || raw === null) return DEFAULT_SETTINGS;
  const saved = raw as Record<string, unknown>;
  const d = DEFAULT_SETTINGS;
  const volume = typeof saved.volume === 'number' && Number.isFinite(saved.volume) ? saved.volume : d.volume;
  return {
    volume: Math.min(1, Math.max(0, volume)),
    probes: typeof saved.probes === 'boolean' ? saved.probes : d.probes,
    size: isSessionSize(saved.size) ? saved.size : d.size,
    introSeen: saved.introSeen === true,
    practiceDone: saved.practiceDone === true,
  };
}
