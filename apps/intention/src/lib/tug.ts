import { aimSign, type Aim } from './scoring.ts';

/**
 * Where the tug's seam sits, worked out only from the bits so far.
 *
 * 1 bits favor the right-hand color. When they lead, the right color spreads and the seam moves left.
 * The seam comes straight from the raw score (deviation ÷ √bits), clamped at ±SEAM_CLAMP.
 */

/** Scores beyond this put the seam at its furthest point. */
export const SEAM_CLAMP = 3;
/** At the clamp, the seam has moved this share of the screen width from the middle. */
export const SEAM_TRAVEL = 0.4;

/** Raw lean of the bits: positive when 1s lead. Not tied to anyone's aim. */
export function rawLean(deviation: number, n: number): number {
  return n > 0 ? deviation / Math.sqrt(n) : 0;
}

/** Seam position as a share of the width from the left edge: 0.5 is the middle. */
export function seamPosition(deviation: number, n: number): number {
  const lean = Math.max(-SEAM_CLAMP, Math.min(SEAM_CLAMP, rawLean(deviation, n)));
  return 0.5 - (lean / SEAM_CLAMP) * SEAM_TRAVEL;
}

/** Share of the screen your color covers. */
export function yourShare(aim: Aim, seam: number): number {
  return aim === 'left' ? seam : 1 - seam;
}

/** Which way your color travels across the screen as it wins: the right color moves left, and back. */
export type Direction = 'toward-left' | 'toward-right';

export function travelDirection(aim: Aim): Direction {
  return aim === 'right' ? 'toward-left' : 'toward-right';
}

/** The small arrow in the pill. */
export function arrowFor(aim: Aim): '←' | '→' {
  return travelDirection(aim) === 'toward-left' ? '←' : '→';
}

/** True when this bit helps your color. */
export function bitFavorsYou(bit: number, aim: Aim): boolean {
  return (bit ? 1 : -1) * aimSign(aim) > 0;
}
