import { CUSTOM } from '../lib/settings';

/**
 * A soft colour change per preset. Star one (left ear) is always cream.
 * Star two (right ear) and the glow behind the orbit shift a little.
 */
export interface Tint {
  /** Centre of the glow behind the orbit. */
  nebula: string;
  /** The right-ear star and its trail. */
  companion: string;
}

const TINTS: Record<string, Tint> = {
  sleep: { nebula: '#1c1546', companion: '#d6bfe6' },
  calm: { nebula: '#141a3d', companion: '#e6c88f' },
  relaxed: { nebula: '#10263f', companion: '#e9d7a4' },
  focus: { nebula: '#171d4b', companion: '#f0cf8a' },
  deep: { nebula: '#271a42', companion: '#f2b98c' },
  [CUSTOM]: { nebula: '#16213f', companion: '#e6c88f' },
};

export const STAR = '#f3ebdd';
export const GOLD = '#e6c88f';
export const LAVENDER = '#9ea3c4';

export function tintFor(selection: string): Tint {
  return TINTS[selection] ?? TINTS.calm!;
}
