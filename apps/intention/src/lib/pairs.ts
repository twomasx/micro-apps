import type { Aim } from './scoring.ts';

export interface NamedColor {
  name: string;
  hex: string;
}

/** Two colors that share the screen. The left color is listed first. */
export interface ColorPair {
  id: string;
  left: NamedColor;
  right: NamedColor;
}

export const PRESET_PAIRS: readonly ColorPair[] = [
  { id: 'ember-glacier', left: { name: 'Ember', hex: '#f2683c' }, right: { name: 'Glacier', hex: '#7fc8e8' } },
  { id: 'rose-navy', left: { name: 'Rose', hex: '#e85d8a' }, right: { name: 'Navy', hex: '#25366a' } },
  { id: 'saffron-indigo', left: { name: 'Saffron', hex: '#f3b53b' }, right: { name: 'Indigo', hex: '#3d3aa6' } },
  { id: 'peach-lilac', left: { name: 'Peach', hex: '#f7a07a' }, right: { name: 'Lilac', hex: '#a68bf6' } },
  {
    id: 'chartreuse-magenta',
    left: { name: 'Chartreuse', hex: '#c3dd47' },
    right: { name: 'Magenta', hex: '#cf3f95' },
  },
  { id: 'day-night', left: { name: 'Day', hex: '#f1efe9' }, right: { name: 'Night', hex: '#1b1b1f' } },
  { id: 'tangerine-plum', left: { name: 'Tangerine', hex: '#ff8a3d' }, right: { name: 'Plum', hex: '#5b2a6e' } },
];

export const DEFAULT_PAIR = PRESET_PAIRS[0]!;

export function pairName(pair: ColorPair): string {
  return `${pair.left.name} and ${pair.right.name}`;
}

/** Your color for an aim, and the other one. */
export function colorsFor(pair: ColorPair, aim: Aim): { mine: NamedColor; other: NamedColor } {
  return aim === 'left' ? { mine: pair.left, other: pair.right } : { mine: pair.right, other: pair.left };
}
