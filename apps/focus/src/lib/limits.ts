import type { Preset } from './presets';

/** What is free and what the lifetime unlock adds. The price lives in config/products.json. */
export const FREE_SESSION_MINUTES = [5, 10] as const;
export const UNLOCKED_SESSION_MINUTES = [5, 10, 15, 20, 30, 45, 60, 90] as const;
export const FREE_PRIME_MINUTES = [10] as const;
export const UNLOCKED_PRIME_MINUTES = [10, 15, 20] as const;
/** Free users can listen to a locked preset for this long before the unlock offer. */
export const PREVIEW_MS = 60_000;

const MINUTE_MS = 60_000;

export function sessionMinutesOptions(unlocked: boolean): readonly number[] {
  return unlocked ? UNLOCKED_SESSION_MINUTES : FREE_SESSION_MINUTES;
}

export function primeMinutesOptions(unlocked: boolean): readonly number[] {
  return unlocked ? UNLOCKED_PRIME_MINUTES : FREE_PRIME_MINUTES;
}

export function maxSessionMinutes(unlocked: boolean): number {
  return Math.max(...sessionMinutesOptions(unlocked));
}

/** The longest allowed option that is not longer than what was asked for. */
function clampToOptions(minutes: number, options: readonly number[]): number {
  const shortest = Math.min(...options);
  if (!Number.isFinite(minutes)) return shortest;
  const fitting = options.filter((option) => option <= minutes);
  return fitting.length > 0 ? Math.max(...fitting) : shortest;
}

export function clampSessionMinutes(minutes: number, unlocked: boolean): number {
  return clampToOptions(minutes, sessionMinutesOptions(unlocked));
}

export function clampPrimeMinutes(minutes: number, unlocked: boolean): number {
  return clampToOptions(minutes, primeMinutesOptions(unlocked));
}

export function isPresetLocked(preset: Pick<Preset, 'free'>, unlocked: boolean): boolean {
  return !unlocked && !preset.free;
}

export interface PlaybackLimit {
  durationMs: number;
  /** True when this is the 60 second preview of a locked preset. */
  preview: boolean;
}

/** How long a session may run for this preset and this user. Prime mode has its own lengths. */
export function playbackLimit(
  preset: Pick<Preset, 'free'>,
  requestedMinutes: number,
  unlocked: boolean,
  prime = false,
): PlaybackLimit {
  if (isPresetLocked(preset, unlocked)) return { durationMs: PREVIEW_MS, preview: true };
  const minutes = prime
    ? clampPrimeMinutes(requestedMinutes, unlocked)
    : clampSessionMinutes(requestedMinutes, unlocked);
  return { durationMs: minutes * MINUTE_MS, preview: false };
}

export function canUseCustomBeat(unlocked: boolean): boolean {
  return unlocked;
}

export function canUseNoise(unlocked: boolean): boolean {
  return unlocked;
}

export function canSaveHistory(unlocked: boolean): boolean {
  return unlocked;
}
