/**
 * Small helpers for writing the specimen SVGs as strings. The specimens are generated once,
 * when the page is built, and land in the HTML as inline SVG. No specimen code ships to the browser.
 */

/** Every specimen draws in this box. CSS scales it. */
export const WIDTH = 120;
export const HEIGHT = 80;

/** A number short enough for an SVG attribute. */
export const n = (value: number, digits = 2): string => {
  const fixed = value.toFixed(digits);
  return fixed.includes('.') ? fixed.replace(/0+$/, '').replace(/\.$/, '') : fixed;
};

export interface Point {
  x: number;
  y: number;
}

/** A polyline as path data. */
export function polyline(points: readonly Point[], close = false): string {
  const body = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${n(p.x)} ${n(p.y)}`).join('');
  return close ? `${body}Z` : body;
}

/** Wraps specimen content in its outer SVG. Decorative, so it is hidden from screen readers. */
export function frame(id: string, body: string): string {
  return `<svg class="specimen-art" data-specimen="${id}" viewBox="0 0 ${WIDTH} ${HEIGHT}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">${body}</svg>`;
}

/** Small, repeatable random numbers from a seed (mulberry32). The same seed draws the same picture. */
export function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const smoothstep = (edge0: number, edge1: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

/** keyTimes for SMIL: fractions of the loop, rounded, ending at exactly 1. */
export const keyTimes = (times: readonly number[]): string => times.map((t) => n(t, 4)).join(';');

/**
 * values and keyTimes attributes for a SMIL animation. Points that share a time with the one
 * before are dropped (they always hold the same value here), because some browsers reject
 * repeated keyTimes.
 */
export function timeline(values: readonly (number | string)[], times: readonly number[]): string {
  const kept: number[] = [];
  times.forEach((time, i) => {
    if (i > 0 && n(time, 4) === n(times[i - 1]!, 4)) return;
    kept.push(i);
  });
  const show = (v: number | string) => (typeof v === 'number' ? n(v) : v);
  return `values="${kept.map((i) => show(values[i]!)).join(';')}" keyTimes="${keyTimes(kept.map((i) => times[i]!))}"`;
}
