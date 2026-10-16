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

/** sRGB channel (0 to 255) to linear light (0 to 1). */
export function toLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Linear light (0 to 1) back to an sRGB channel (0 to 255). */
export function fromLinear(value: number): number {
  const v = Math.max(0, Math.min(1, value));
  return 255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055);
}

/** WCAG relative luminance. */
export function luminance(c: Rgb): number {
  return 0.2126 * toLinear(c[0]) + 0.7152 * toLinear(c[1]) + 0.0722 * toLinear(c[2]);
}

/** WCAG contrast ratio, 1 to 21. */
export function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** Oklab (Björn Ottosson, 2020): a color space where distances match how different colors look. */
export function oklab(c: Rgb): [number, number, number] {
  const r = toLinear(c[0]);
  const g = toLinear(c[1]);
  const b = toLinear(c[2]);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/** How different two colors look: distance in Oklab. About 0.02 is just noticeable. */
export function oklabDistance(a: Rgb, b: Rgb): number {
  const [l1, a1, b1] = oklab(a);
  const [l2, a2, b2] = oklab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

export function rgbToHex(c: Rgb): string {
  return `#${c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`;
}
