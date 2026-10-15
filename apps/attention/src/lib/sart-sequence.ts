/**
 * The SART (Robertson and others, 1997): digits 1 to 9, one at a time. Tap for every digit except 3.
 */
export type SartLength = 'practice' | 'quick' | 'full';

export const DIGIT_MS = 250;
export const MASK_MS = 900;
export const TRIAL_MS = DIGIT_MS + MASK_MS;
/** Taps sooner than this after a digit appears are anticipations, not responses. */
export const ANTICIPATION_MS = 100;
export const NO_GO_DIGIT = 3;

/** How many times each digit appears. */
export const REPEATS: Record<SartLength, number> = { practice: 2, quick: 12, full: 25 };

/**
 * The original's five font sizes were 48, 72, 94, 100 and 120 point.
 * Kept as fractions of the largest, so the screen sets the real size.
 */
export const FONT_SCALES = [48 / 120, 72 / 120, 94 / 120, 100 / 120, 1] as const;

export interface SartItem {
  digit: number;
  /** Index into FONT_SCALES. */
  size: number;
}

/** Fisher-Yates. `random` returns [0, 1). */
function shuffle<T>(items: T[], random: () => number): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [items[i], items[j]] = [items[j]!, items[i]!];
  }
  return items;
}

/** A random order with each digit equally often and a random size for each one. */
export function buildSequence(length: SartLength, random: () => number = Math.random): SartItem[] {
  const digits: number[] = [];
  for (let digit = 1; digit <= 9; digit++) for (let n = 0; n < REPEATS[length]; n++) digits.push(digit);
  return shuffle(digits, random).map((digit) => ({
    digit,
    size: Math.floor(random() * FONT_SCALES.length),
  }));
}

/** Expected length of a run, in seconds: 108 digits is about 2 minutes, 225 about 4.3. */
export function sequenceSeconds(length: SartLength): number {
  return (REPEATS[length] * 9 * TRIAL_MS) / 1000;
}
