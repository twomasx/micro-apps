/**
 * Specks of light: one per random bit, sent from the seam into the side that bit favors.
 * 1 bits favor the right-hand color, so their specks drift right; 0 bits drift left.
 */

export interface Speck {
  /** Height on the screen, 0 at the top and 1 at the bottom. */
  y: number;
  /** +1 drifts into the right color, −1 into the left. */
  side: 1 | -1;
  /** Seconds since it left the seam. */
  age: number;
  /** Phase of its small sideways wobble. */
  wobble: number;
}

/** Seconds a speck lives. */
export const SPECK_LIFE = 1.2;
/** At 200 bits a second about 240 are alive. The cap only matters after a long pause. */
export const MAX_SPECKS = 320;

export function speckSide(bit: number): 1 | -1 {
  return bit ? 1 : -1;
}

/** Adds one speck per new bit. Positions are decoration, so Math.random is fine here. */
export function spawnSpecks(specks: Speck[], bits: readonly number[], random: () => number = Math.random): void {
  for (const bit of bits) {
    specks.push({ y: 0.04 + random() * 0.92, side: speckSide(bit), age: 0, wobble: random() * Math.PI * 2 });
  }
  if (specks.length > MAX_SPECKS) specks.splice(0, specks.length - MAX_SPECKS);
}

/** Ages every speck and drops the ones that have faded out. */
export function ageSpecks(specks: Speck[], dt: number): void {
  let kept = 0;
  for (const speck of specks) {
    speck.age += dt;
    if (speck.age < SPECK_LIFE) specks[kept++] = speck;
  }
  specks.length = kept;
}

/** How far into its side a speck has gone, 0 to 1: fast at first, settling as it fades. */
export function speckTravel(age: number): number {
  const life = Math.min(1, age / SPECK_LIFE);
  return 1 - (1 - life) * (1 - life);
}

/** Brightness: rises and falls smoothly, so nothing pops or flashes. */
export function speckAlpha(age: number): number {
  const life = Math.min(1, age / SPECK_LIFE);
  return Math.sin(Math.PI * life);
}
