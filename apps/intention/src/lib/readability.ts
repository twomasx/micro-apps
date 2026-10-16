import { contrast, lighten, mix, type Rgb } from './color.ts';

/**
 * Night style keeps white text and a white button on any pair. What changes per pair is the dark shading
 * at the top and bottom edges: just enough that text passes WCAG AA over the lightest the field can get.
 *
 * The field brightens in three ways (see field/draw.ts): the winning side lightens 8%, its glow adds up to
 * a pale tint, and your side carries a pale band along the seam. The worst case stacks all three, so the
 * shading holds wherever the seam is and whoever is winning.
 */

/** The shading color, the same as `--shade` in styles.css. */
export const SHADE: Rgb = [20, 20, 24];
const WHITE: Rgb = [255, 255, 255];
/** `--ink-muted`: the caption under the score is white at 84%. */
export const MUTED_ALPHA = 0.84;

/** WCAG AA: 4.5:1 for normal text, 3:1 for large text (24 px and up) and for controls. */
export const AA_TEXT = 4.5;
export const AA_LARGE = 3;

/** Never lighter than these, so every pair keeps the same Night look. */
const MIN_BOTTOM = 0.45;
const MIN_TOP = 0.3;
const MAX_SHADE = 0.92;
/** A little extra, so rounding in the browser never drops a pair below the line. */
const MARGIN = 0.03;

/** The lightest a color gets on screen. */
export function brightest(c: Rgb): Rgb {
  const winner = lighten(c, 0.08);
  const glowing = mix(winner, lighten(c, 0.6), 0.3);
  return mix(glowing, lighten(c, 0.75), 0.35);
}

/** A background with the dark shading laid over it at `alpha`, blended as browsers do. */
export function shaded(background: Rgb, alpha: number): Rgb {
  return mix(background, SHADE, alpha);
}

/** Contrast of white text, and of the muted caption, over a shaded background. */
export function textContrast(background: Rgb, alpha: number): { white: number; muted: number } {
  const bg = shaded(background, alpha);
  return { white: contrast(WHITE, bg), muted: contrast(mix(bg, WHITE, MUTED_ALPHA), bg) };
}

/** The smallest alpha in [min, MAX_SHADE] where `passes` holds, found by halving. */
function smallestAlpha(min: number, passes: (alpha: number) => boolean): number {
  if (passes(min)) return min;
  let lo = min;
  let hi = MAX_SHADE;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (passes(mid)) hi = mid;
    else lo = mid;
  }
  return Math.min(MAX_SHADE, hi + MARGIN);
}

export interface Shading {
  /** Under the bottom text, the Begin button and the dot. */
  bottom: number;
  /** Under the headline and the progress ring. */
  top: number;
}

/** Shading for a pair: enough for AA over the lighter of its two colors at their brightest. */
export function shadingFor(left: Rgb, right: Rgb): Shading {
  const backgrounds = [brightest(left), brightest(right)];
  const bottom = smallestAlpha(MIN_BOTTOM, (alpha) =>
    backgrounds.every((bg) => {
      const c = textContrast(bg, alpha);
      return c.white >= AA_TEXT && c.muted >= AA_TEXT;
    }),
  );
  // The headline is large text and the ring is a control: both need 3:1.
  const top = smallestAlpha(MIN_TOP, (alpha) => backgrounds.every((bg) => textContrast(bg, alpha).white >= AA_LARGE));
  return { bottom, top };
}
