/**
 * The enso brush stroke as pure geometry, so it can be tested and drawn at any size.
 * A stroke is a ring of samples in unit space (radius about 1, centered on 0) plus a set
 * of bristles. Drawing lays each bristle along the ring, offset across the stroke's width.
 * Bristles break apart near the end, which gives the dry-brush tail.
 */

export interface StrokeSample {
  /** 0 at the first touch of the brush, 1 at the lift. */
  t: number;
  x: number;
  y: number;
  /** Unit normal, pointing outward. Bristles are offset along it. */
  nx: number;
  ny: number;
  /** Half the stroke width, in radius units. */
  half: number;
  /** Ragged edges: how far the outer and inner edge sit from the center line, as a share of half. */
  outer: number;
  inner: number;
  /** 0 is a wet stroke, 1 is bone dry. */
  dryness: number;
}

export interface Bristle {
  /** -1 (inner edge) to 1 (outer edge). */
  offset: number;
  /** How much ink it holds. Bristles with less run dry sooner. */
  ink: number;
  /** Seed for where this bristle skips. */
  seed: number;
  /** How long its streaks are: lower is longer. */
  grain: number;
  /** Where along the stroke this bristle runs out of ink. */
  runsOut: number;
}

export interface Stroke {
  samples: StrokeSample[];
  bristles: Bristle[];
  /** Widest half-width, in radius units. */
  maxHalf: number;
}

/** Stroke width at its widest, as a share of the radius. */
export const STROKE_WIDTH = 0.12;
/** How much of the full circle the brush travels. The gap is part of the enso. */
export const SWEEP_MIN = 0.86;
export const SWEEP_MAX = 0.93;

/** Small, repeatable random numbers from a seed (mulberry32). */
export function seededRandom(seed: number): () => number {
  let state = Math.floor(seed * 2654435761) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(a: number, b: number): number {
  let h = Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Smooth 1D value noise in [0, 1]. */
export function valueNoise(seed: number, x: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const s = f * f * (3 - 2 * f);
  return hash(seed, i) * (1 - s) + hash(seed, i + 1) * s;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Half-width along the stroke: the brush lands with a press, swells and thins with the hand,
 * then narrows a little toward the lift. A dry brush splays, so it never tapers to a point.
 */
export function widthAt(t: number, wobble: number): number {
  const land = 0.55 + 0.45 * smoothstep(0, 0.02, t);
  const press = 1 + 0.22 * Math.exp(-((t - 0.035) ** 2) / 0.0006);
  const taper = 1 - 0.38 * smoothstep(0.55, 1, t);
  return (STROKE_WIDTH / 2) * land * press * taper * (1 + 0.34 * (wobble - 0.5));
}

/** Dryness along the stroke: wet for the first part, then running out of ink. */
export function drynessAt(t: number): number {
  return 0.95 * smoothstep(0.42, 1, t) ** 1.2;
}

/**
 * How much of the stroke's width is solid body at a dryness: all of it while wet, none once
 * the brush is about a third dry. The rest is painted as bristles.
 */
export function bodyShare(dryness: number): number {
  return 1 - smoothstep(0, 0.35, dryness);
}

/** Builds the stroke for a seed. The same seed always gives the same stroke. */
export function buildStroke(seed: number, bristleCount = 24, sampleCount = 420): Stroke {
  const random = seededRandom(seed);
  // Brushes usually start low on the left and travel clockwise (on screen, y points down),
  // so the open gap sits at the lower left.
  const start = Math.PI * (0.8 + (random() - 0.5) * 0.14);
  const sweep = Math.PI * 2 * (SWEEP_MIN + random() * (SWEEP_MAX - SWEEP_MIN));
  const squash = 1 + (random() - 0.5) * 0.06;
  const phases = [random() * 6.28, random() * 6.28, random() * 6.28];
  const noiseSeed = Math.floor(random() * 1e6);

  const radiusAt = (t: number, angle: number) =>
    (1 +
      0.018 * Math.sin(angle * 2 + phases[0]!) +
      0.012 * Math.sin(angle * 3 + phases[1]!) +
      0.008 * Math.sin(angle * 5 + phases[2]!)) *
    // The hand drifts slightly inward as the stroke closes.
    (1 - 0.035 * t * t);

  const point = (t: number) => {
    const angle = start + sweep * t;
    const r = radiusAt(t, angle);
    return { x: Math.cos(angle) * r * squash, y: Math.sin(angle) * r };
  };

  const samples: StrokeSample[] = [];
  let maxHalf = 0;
  for (let i = 0; i <= sampleCount; i++) {
    const t = i / sampleCount;
    const p = point(t);
    const a = point(Math.max(0, t - 0.001));
    const b = point(Math.min(1, t + 0.001));
    // Tangent along the travel; the outward normal is the tangent turned a quarter.
    const tx = b.x - a.x;
    const ty = b.y - a.y;
    const len = Math.hypot(tx, ty) || 1;
    const half = widthAt(t, valueNoise(noiseSeed, t * 4.5));
    maxHalf = Math.max(maxHalf, half);
    samples.push({
      t,
      x: p.x,
      y: p.y,
      nx: ty / len,
      ny: -tx / len,
      half,
      outer: 1 + 0.07 * (valueNoise(noiseSeed + 1, t * 60) - 0.5),
      inner: 1 + 0.07 * (valueNoise(noiseSeed + 2, t * 60) - 0.5),
      dryness: drynessAt(t),
    });
  }

  const bristles: Bristle[] = [];
  for (let j = 0; j < bristleCount; j++) {
    const offset = -1 + (2 * (j + 0.5)) / bristleCount + (random() - 0.5) * (1.2 / bristleCount);
    // The edges of a brush hold less ink than the middle.
    const edge = Math.abs(offset);
    const ink = Math.min(1, Math.max(0, 0.35 + 0.65 * random() - 0.35 * edge * edge));
    bristles.push({
      offset,
      ink,
      seed: Math.floor(random() * 1e6),
      grain: 14 + 26 * random(),
      runsOut: 0.7 + 0.32 * ink,
    });
  }

  return { samples, bristles, maxHalf };
}

/**
 * Whether a bristle leaves ink at a point. Wet strokes are solid. As the brush dries,
 * low-ink bristles skip first, in streaks along the travel.
 */
export function bristleInks(bristle: Bristle, sample: StrokeSample, dryScale = 1): boolean {
  if (sample.dryness <= 0) return true;
  const streak = valueNoise(bristle.seed, sample.t * bristle.grain);
  // Past its own run-out point a bristle leaves only the odd scratch.
  if (sample.t > bristle.runsOut + (1 - dryScale) * 0.3) return streak > 0.9;
  return streak > sample.dryness * dryScale * (1.15 - 0.6 * bristle.ink);
}
