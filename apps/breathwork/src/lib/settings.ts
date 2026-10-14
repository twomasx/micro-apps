import { DEFAULT_MINUTES, UNLOCKED_MINUTES } from './limits';
import { findTechnique } from './techniques';

/** What the breathing screen remembers on this device between visits. */
export interface Settings {
  techniqueId: string;
  minutes: number;
  muted: boolean;
  /** The first-visit screen (how to follow the shape, the safety line) has been answered. */
  introSeen: boolean;
}

/** The cyclic sigh for 5 minutes: what the study behind it tested. */
export const DEFAULT_SETTINGS: Settings = {
  techniqueId: 'sigh',
  minutes: DEFAULT_MINUTES,
  muted: false,
  introSeen: false,
};

/** Turns whatever was in storage into valid settings. Unknown or broken fields fall back to the defaults. */
export function sanitizeSettings(raw: unknown): Settings {
  if (typeof raw !== 'object' || raw === null) return DEFAULT_SETTINGS;
  const saved = raw as Record<string, unknown>;
  const d = DEFAULT_SETTINGS;
  return {
    techniqueId: typeof saved.techniqueId === 'string' && findTechnique(saved.techniqueId) ? saved.techniqueId : d.techniqueId,
    minutes:
      typeof saved.minutes === 'number' && (UNLOCKED_MINUTES as readonly number[]).includes(saved.minutes)
        ? saved.minutes
        : d.minutes,
    muted: saved.muted === true,
    introSeen: saved.introSeen === true,
  };
}
