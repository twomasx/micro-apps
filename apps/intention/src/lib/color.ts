/** Color math for the tug field. Colors are [r, g, b] with 0 to 255 channels. */

export type Rgb = readonly [number, number, number];

const HEX = /^#([0-9a-f]{6})$/i;

export function isHex(value: string): boolean {
  return HEX.test(value);
}

export function hexToRgb(hex: string): Rgb {
  const match = HEX.exec(hex);
  if (!match) throw new Error(`Not a #rrggbb color: ${hex}`);
  const n = parseInt(match[1]!, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbCss([r, g, b]: Rgb, alpha = 1): string {
  const c = (v: number) => Math.round(Math.max(0, Math.min(255, v)));
  return alpha >= 1 ? `rgb(${c(r)} ${c(g)} ${c(b)})` : `rgb(${c(r)} ${c(g)} ${c(b)} / ${alpha.toFixed(3)})`;
}

/** Straight blend from `a` (k = 0) to `b` (k = 1). */
export function mix(a: Rgb, b: Rgb, k: number): Rgb {
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}

const WHITE: Rgb = [255, 255, 255];
const BLACK: Rgb = [0, 0, 0];

export const lighten = (c: Rgb, k: number): Rgb => mix(c, WHITE, k);
export const darken = (c: Rgb, k: number): Rgb => mix(c, BLACK, k);

/** Moves a color toward the gray of the same brightness. k = 1 is fully gray. */
export function desaturate(c: Rgb, k: number): Rgb {
  const gray = 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
  return mix(c, [gray, gray, gray], k);
}
