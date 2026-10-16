import { luminance, oklab, type Rgb } from './color.ts';

/**
 * Plain names for custom colors, so the pill can always name your color ("Your color: Teal").
 * Hue anchors are the Oklch hues of familiar colors; a color takes the nearest one.
 */

const HUES: readonly [string, number][] = [
  ['Red', 29],
  ['Orange', 55],
  ['Yellow', 105],
  ['Lime', 125],
  ['Green', 145],
  ['Teal', 180],
  ['Cyan', 200],
  ['Sky', 228],
  ['Blue', 262],
  ['Violet', 295],
  ['Magenta', 330],
  ['Pink', 355],
];

function hueDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d);
}

export function colorName(c: Rgb): string {
  const [l, a, b] = oklab(c);
  const chroma = Math.hypot(a, b);
  if (chroma < 0.025) {
    if (l > 0.93) return 'White';
    if (l < 0.22) return 'Black';
    return l > 0.7 ? 'Light gray' : l < 0.4 ? 'Dark gray' : 'Gray';
  }
  const hue = ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
  let best = HUES[0]!;
  for (const entry of HUES) if (hueDistance(hue, entry[1]) < hueDistance(hue, best[1])) best = entry;
  const name = best[0];
  if (l < 0.42) return `Deep ${name.toLowerCase()}`;
  if (l > 0.88 && name !== 'Yellow') return `Pale ${name.toLowerCase()}`;
  return name;
}

/** Names for a custom pair that are never the same, so "Your color" always says which one. */
export function pairNames(left: Rgb, right: Rgb): [string, string] {
  const a = colorName(left);
  const b = colorName(right);
  if (a !== b) return [a, b];
  const la = luminance(left);
  const lb = luminance(right);
  if (Math.abs(la - lb) > 0.02) {
    const lower = (name: string) => name.charAt(0).toLowerCase() + name.slice(1);
    return la > lb ? [`Light ${lower(a)}`, `Dark ${lower(b)}`] : [`Dark ${lower(a)}`, `Light ${lower(b)}`];
  }
  return ['Left color', 'Right color'];
}
