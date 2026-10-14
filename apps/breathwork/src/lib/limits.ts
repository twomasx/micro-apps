import { cycleMs, type Technique } from './techniques';

/** What is free and what the lifetime unlock adds. The price lives in config/products.json. */
export const FREE_MINUTES = [1, 3, 5] as const;
export const UNLOCKED_MINUTES = [1, 3, 5, 10, 15, 20] as const;
export const DEFAULT_MINUTES = 5;
/** Free users can follow a locked technique or a custom pattern for this long before the unlock offer. */
export const PREVIEW_MS = 60_000;

const MINUTE_MS = 60_000;

export function minuteOptions(unlocked: boolean): readonly number[] {
  return unlocked ? UNLOCKED_MINUTES : FREE_MINUTES;
}

/** The longest allowed length that is not longer than what was asked for. */
export function clampMinutes(minutes: number, unlocked: boolean): number {
  const options = minuteOptions(unlocked);
  const shortest = Math.min(...options);
  if (!Number.isFinite(minutes)) return DEFAULT_MINUTES;
  const fitting = options.filter((option) => option <= minutes);
  return fitting.length > 0 ? Math.max(...fitting) : shortest;
}

export function isTechniqueLocked(technique: Pick<Technique, 'free'>, unlocked: boolean): boolean {
  return !unlocked && !technique.free;
}

/** Custom patterns are part of the lifetime unlock. */
export function canSaveCustom(unlocked: boolean): boolean {
  return unlocked;
}

export function canSeeWeek(unlocked: boolean): boolean {
  return unlocked;
}

/**
 * Rounds a length to whole breaths, at least one, so a session never stops in the middle of
 * a breath. 5 minutes of the cyclic sigh (9 s breaths) is 33 breaths, 297 s.
 */
export function wholeBreathsMs(durationMs: number, technique: Pick<Technique, 'phases'>): number {
  const breath = cycleMs(technique);
  return Math.max(1, Math.round(durationMs / breath)) * breath;
}

export interface SessionPlan {
  durationMs: number;
  /** True when this is the one minute preview of something locked. */
  preview: boolean;
}

/** How long a session of this technique runs for this user. */
export function sessionPlan(
  technique: Pick<Technique, 'free' | 'phases'>,
  requestedMinutes: number,
  unlocked: boolean,
): SessionPlan {
  if (isTechniqueLocked(technique, unlocked)) {
    return { durationMs: wholeBreathsMs(PREVIEW_MS, technique), preview: true };
  }
  const minutes = clampMinutes(requestedMinutes, unlocked);
  return { durationMs: wholeBreathsMs(minutes * MINUTE_MS, technique), preview: false };
}
