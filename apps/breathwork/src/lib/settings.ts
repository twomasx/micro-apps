import { isValidCustom, type CustomPattern } from './custom';
import { DEFAULT_MINUTES, UNLOCKED_MINUTES } from './limits';
import { findTechnique } from './techniques';

/** The technique id the settings use for "the custom pattern in `custom`". */
export const CUSTOM_ID = 'custom';

/** What the breathing screen remembers on this device between visits. */
export interface Settings {
  techniqueId: string;
  minutes: number;
  muted: boolean;
  /** The first-visit screen (how to follow the shape, the safety line) has been answered. */
  introSeen: boolean;
  /** The custom pattern last breathed or built. Used when techniqueId is 'custom'. */
  custom: CustomPattern | null;
}

/** The cyclic sigh for 5 minutes: what the study behind it tested. */
export const DEFAULT_SETTINGS: Settings = {
  techniqueId: 'sigh',
  minutes: DEFAULT_MINUTES,
  muted: false,
  introSeen: false,
  custom: null,
};

/** Turns whatever was in storage into valid settings. Unknown or broken fields fall back to the defaults. */
export function sanitizeSettings(raw: unknown): Settings {
  if (typeof raw !== 'object' || raw === null) return DEFAULT_SETTINGS;
  const saved = raw as Record<string, unknown>;
  const d = DEFAULT_SETTINGS;
  const custom = sanitizeCustom(saved.custom);
  const knownId =
    typeof saved.techniqueId === 'string' &&
    (findTechnique(saved.techniqueId) !== undefined || (saved.techniqueId === CUSTOM_ID && custom !== null));
  return {
    techniqueId: knownId ? (saved.techniqueId as string) : d.techniqueId,
    minutes:
      typeof saved.minutes === 'number' && (UNLOCKED_MINUTES as readonly number[]).includes(saved.minutes)
        ? saved.minutes
        : d.minutes,
    muted: saved.muted === true,
    introSeen: saved.introSeen === true,
    custom,
  };
}

function sanitizeCustom(raw: unknown): CustomPattern | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const pattern = { in: Number(r.in), holdIn: Number(r.holdIn), out: Number(r.out), holdOut: Number(r.holdOut) };
  return isValidCustom(pattern) ? pattern : null;
}
