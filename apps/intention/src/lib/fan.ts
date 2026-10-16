/**
 * The color fan: swatches spread in a quarter arc up and to the left of the color dot, like a paint
 * swatch fan deck. Offsets are in CSS pixels from the dot's center.
 */

export interface FanSpot {
  x: number;
  y: number;
}

/** Swatch size. Never below 44 px, the smallest comfortable touch target. */
export const SWATCH = 48;
export const MIN_SWATCH = 44;
/** Room between neighboring swatches along the arc. */
const GAP = 8;
/**
 * From a little above straight left (195°) to straight up (270°). Starting at 180° put the first swatch on
 * the Begin button's row.
 */
export const START_DEG = 195;
const END_DEG = 270;

/** Space kept between the leftmost swatch and the screen edge. */
const EDGE = 8;

/**
 * The radius that leaves GAP between swatches, made smaller when the room left of the dot is short
 * (a 360 px phone), so no swatch leaves the screen. `room` is the distance from the dot's center to the
 * left edge of the screen.
 */
export function fanRadius(count: number, room = Number.POSITIVE_INFINITY): number {
  const span = ((END_DEG - START_DEG) * Math.PI) / 180;
  const needed = ((SWATCH + GAP) * (count - 1)) / span;
  const fits = (room - SWATCH / 2 - EDGE) / Math.abs(Math.cos((START_DEG * Math.PI) / 180));
  return Math.floor(Math.min(needed, fits));
}

export function fanSpots(count: number, radius: number): FanSpot[] {
  return Array.from({ length: count }, (_, i) => {
    const deg = count === 1 ? START_DEG : START_DEG + ((END_DEG - START_DEG) * i) / (count - 1);
    const rad = (deg * Math.PI) / 180;
    // "+ 0" turns −0 into 0.
    return { x: Math.round(Math.cos(rad) * radius) + 0, y: Math.round(Math.sin(rad) * radius) + 0 };
  });
}

/** Swatch size for a radius: full size when there is room, smaller (down to 44 px) on very narrow screens. */
export function swatchSize(count: number, radius: number): number {
  const spacing = (radius * ((END_DEG - START_DEG) * Math.PI)) / 180 / (count - 1);
  return Math.max(MIN_SWATCH, Math.min(SWATCH, Math.floor(spacing - 2)));
}
