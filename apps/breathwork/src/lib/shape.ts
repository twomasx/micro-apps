import type { Phase, PhaseKind } from './techniques';

/**
 * The shape of a breathing pattern: one side per phase, side length in proportion to its
 * seconds, breathing in goes up, holding goes across, breathing out comes down.
 *
 * The path runs clockwise (up the left, across the top, down the right, back along the
 * bottom), so the outside of the shape is always to the left of the direction of travel.
 * When straight sides cannot close the shape with exact lengths (the cyclic sigh's 6 s
 * breath out against 3 s of breathing in, Resonant's two sides, many custom patterns), the
 * longer side bows outward into a curve of exactly its length. Every side keeps its length.
 *
 * Output is in a unit box, screen coordinates: x to the right, y down, 0 to 1.
 */
export interface Point {
  x: number;
  y: number;
}

export interface Side {
  phaseIndex: number;
  kind: PhaseKind;
  ms: number;
  /** Points along the side, first at its start corner, last at its end corner. */
  points: Point[];
  /** Distance along the side at each point. */
  cumulative: number[];
  length: number;
  straight: boolean;
  /** Middle of the side, and the direction pointing out of the shape there. For labels. */
  middle: Point;
  outward: Point;
}

export interface Shape {
  sides: Side[];
  /** Total length of the outline. */
  length: number;
  /** Where along the outline each side starts. */
  starts: number[];
  /** True when every side's length is in exact proportion to its seconds. */
  exact: boolean;
}

/** A side before it is drawn: where it starts and ends, and how long it must be. */
interface Chord {
  from: Point;
  to: Point;
  length: number;
}

const CURVE_SAMPLES = 96;
const TOLERANCE = 1e-6;

const sub = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y });
const add = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y });
const scale = (a: Point, k: number): Point => ({ x: a.x * k, y: a.y * k });
const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const polar = (length: number, degrees: number): Point => ({
  x: length * Math.cos((degrees * Math.PI) / 180),
  y: length * Math.sin((degrees * Math.PI) / 180),
});

function quadratic(a: Point, control: Point, b: Point, t: number): Point {
  const u = 1 - t;
  return {
    x: u * u * a.x + 2 * u * t * control.x + t * t * b.x,
    y: u * u * a.y + 2 * u * t * control.y + t * t * b.y,
  };
}

function curveLength(a: Point, control: Point, b: Point): number {
  let length = 0;
  let previous = a;
  for (let i = 1; i <= CURVE_SAMPLES; i++) {
    const next = quadratic(a, control, b, i / CURVE_SAMPLES);
    length += dist(previous, next);
    previous = next;
  }
  return length;
}

/**
 * Points for one side in math coordinates (y up). A straight side when the chord is already
 * the right length; otherwise a curve bowed to the left of travel (outward), as long as asked.
 */
function drawChord(chord: Chord): { points: Point[]; straight: boolean } {
  const span = dist(chord.from, chord.to);
  if (chord.length - span <= TOLERANCE * Math.max(1, chord.length)) {
    return { points: [chord.from, chord.to], straight: true };
  }
  const direction = scale(sub(chord.to, chord.from), 1 / span);
  const left = { x: -direction.y, y: direction.x };
  const middle = scale(add(chord.from, chord.to), 0.5);
  const controlAt = (h: number) => add(middle, scale(left, h));
  let low = 0;
  let high = chord.length;
  for (let i = 0; i < 60; i++) {
    const h = (low + high) / 2;
    if (curveLength(chord.from, controlAt(h), chord.to) < chord.length) low = h;
    else high = h;
  }
  const control = controlAt((low + high) / 2);
  const points: Point[] = [];
  for (let i = 0; i <= CURVE_SAMPLES; i++) points.push(quadratic(chord.from, control, chord.to, i / CURVE_SAMPLES));
  return { points, straight: false };
}

/** The sequence a shape needs: breaths in, an optional hold, breaths out, an optional hold. */
interface Form {
  ins: number[];
  top: number;
  outs: number[];
  bottom: number;
}

function readForm(phases: readonly Pick<Phase, 'kind' | 'ms'>[]): Form | null {
  let i = 0;
  const take = (kind: PhaseKind) => {
    const run: number[] = [];
    while (i < phases.length && phases[i]!.kind === kind) run.push(phases[i++]!.ms / 1000);
    return run;
  };
  const ins = take('in');
  const tops = take('hold');
  const outs = take('out');
  const bottoms = take('hold');
  if (i !== phases.length || ins.length === 0 || outs.length === 0 || tops.length > 1 || bottoms.length > 1) {
    return null;
  }
  return { ins, top: tops[0] ?? 0, outs, bottom: bottoms[0] ?? 0 };
}

/** Largest root of f between low and high, scanning down from high. */
function largestRoot(f: (h: number) => number, low: number, high: number): number | null {
  if (Math.abs(f(high)) < 1e-9) return high;
  const steps = 400;
  let previousH = high;
  let previous = f(high);
  for (let k = 1; k <= steps; k++) {
    const h = high - ((high - low) * k) / steps;
    const value = f(h);
    if (Math.sign(value) !== Math.sign(previous)) {
      let a = h;
      let b = previousH;
      for (let j = 0; j < 60; j++) {
        const m = (a + b) / 2;
        if (Math.sign(f(m)) === Math.sign(f(a))) a = m;
        else b = m;
      }
      return (a + b) / 2;
    }
    previousH = h;
    previous = value;
  }
  return null;
}

/** No holds: a leaf for one breath in and one out, a fin for the cyclic sigh. */
function chordsWithoutHolds(form: Form): Chord[] {
  const inTotal = form.ins.reduce((s, x) => s + x, 0);
  const outTotal = form.outs.reduce((s, x) => s + x, 0);
  const origin = { x: 0, y: 0 };
  if (form.ins.length === 1 && form.outs.length === 1) {
    // A leaf, tilted up to the right. Both sides bow, the longer one more.
    const top = polar(Math.min(inTotal, outTotal) * 0.88, 50);
    return [
      { from: origin, to: top, length: inTotal },
      { from: top, to: origin, length: outTotal },
    ];
  }
  // Climbs that lean further right each time (80°, 60°, ...), then the breaths out slide back
  // down the right as one long curve, or as equal parts of it when there are several.
  const chords: Chord[] = [];
  let at = origin;
  form.ins.forEach((length, k) => {
    const next = add(at, polar(length, 80 - 20 * k));
    chords.push({ from: at, to: next, length });
    at = next;
  });
  const top = at;
  form.outs.forEach((length, k) => {
    const share = (k + 1) / form.outs.length;
    const next = form.outs.length === 1 ? origin : add(top, scale(sub(origin, top), share));
    chords.push({ from: at, to: next, length });
    at = next;
  });
  return chords;
}

/** Holds present: up, across the top, down, back across the bottom. One in and one out. */
function chordsWithHolds(form: Form): Chord[] {
  const a = form.ins[0]!;
  const c = form.outs[0]!;
  const { top: b, bottom: d } = form;
  const shorter = Math.min(a, c);
  const lowest = shorter * 0.45;
  const P = (h: number) => Math.sqrt(Math.max(0, a * a - h * h));
  const Q = (h: number) => Math.sqrt(Math.max(0, c * c - h * h));
  // Across the top and back along the bottom must cancel: p + b + q - d = 0.
  const D = d - b;

  let height: number | null = null;
  let p = 0;
  let q = 0;
  let topChord = b;

  // 1. Every side straight, as tall as possible (Box, 4-7-8).
  for (const [s1, s2] of [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ] as const) {
    const root = largestRoot((h) => s1 * P(h) + s2 * Q(h) - D, lowest, shorter);
    if (root !== null && (height === null || root > height)) {
      height = root;
      p = s1 * P(root);
      q = s2 * Q(root);
    }
  }

  if (height === null) {
    // 2. The shorter of in and out straight up or down, the other bowed outward.
    const fits = (h: number) => Math.abs(D) <= P(h) + Q(h);
    let h = shorter;
    if (!fits(h)) {
      let low = lowest;
      let high = shorter;
      for (let j = 0; j < 60; j++) {
        const m = (low + high) / 2;
        if (fits(m)) low = m;
        else high = m;
      }
      h = low;
    }
    height = h;
    if (fits(h)) {
      // Lean the side that has room, so the other one bows as little as possible.
      p = Math.max(-P(h), Math.min(P(h), D));
      q = D - p;
    } else {
      // 3. Holds longer than the breaths can span: the longer hold bows outward instead.
      p = Math.sign(D) * P(h);
      q = Math.sign(D) * Q(h);
      // A longer bottom hold needs nothing more: the bottom corner lands at p + b + q,
      // so the hold back to the start is that long and bows to its own length.
      if (b > d) topChord = d - p - q;
    }
  }

  const corners: Point[] = [{ x: 0, y: 0 }, { x: p, y: height }];
  const chords: Chord[] = [{ from: corners[0]!, to: corners[1]!, length: a }];
  let at = corners[1]!;
  if (b > 0) {
    const next = { x: at.x + topChord, y: height };
    chords.push({ from: at, to: next, length: b });
    at = next;
  }
  const bottomRight = { x: at.x + q, y: 0 };
  chords.push({ from: at, to: bottomRight, length: c });
  if (d > 0) chords.push({ from: bottomRight, to: { x: 0, y: 0 }, length: d });
  // Bottom corner may be off by rounding when there is no bottom hold: snap it closed.
  if (d === 0) chords[chords.length - 1]!.to = { x: 0, y: 0 };
  return chords;
}

/** Anything else: corners spread around a circle, every side the same, lengths not exact. */
function chordsFallback(phases: readonly Pick<Phase, 'ms'>[]): Chord[] {
  const n = Math.max(3, phases.length);
  const corners = Array.from({ length: n }, (_, k) => polar(1, 225 - (360 * k) / n));
  return phases.map((_, k) => {
    const from = corners[k % n]!;
    const to = corners[(k + 1) % n]!;
    return { from, to, length: dist(from, to) };
  });
}

/** Builds the shape for a list of phases. */
export function buildShape(phases: readonly Pick<Phase, 'kind' | 'ms'>[]): Shape {
  const form = readForm(phases);
  let chords: Chord[];
  if (!form) chords = chordsFallback(phases);
  else if (form.top === 0 && form.bottom === 0) chords = chordsWithoutHolds(form);
  else if (form.ins.length === 1 && form.outs.length === 1) chords = chordsWithHolds(form);
  else chords = chordsFallback(phases);

  const drawn = chords.map(drawChord);

  // A chord longer than its side cannot be bowed; it stays straight and the shape is not exact.
  const exact =
    form !== null && chords.every((chord) => dist(chord.from, chord.to) <= chord.length * (1 + 1e-6));

  // Fit into the unit box, centred, y flipped to screen coordinates.
  const all = drawn.flatMap((side) => side.points);
  const minX = Math.min(...all.map((pt) => pt.x));
  const maxX = Math.max(...all.map((pt) => pt.x));
  const minY = Math.min(...all.map((pt) => pt.y));
  const maxY = Math.max(...all.map((pt) => pt.y));
  const size = Math.max(maxX - minX, maxY - minY) || 1;
  const k = 1 / size;
  const offsetX = (1 - (maxX - minX) * k) / 2;
  const offsetY = (1 - (maxY - minY) * k) / 2;
  const fit = (pt: Point): Point => ({ x: (pt.x - minX) * k + offsetX, y: 1 - ((pt.y - minY) * k + offsetY) });

  const sides: Side[] = drawn.map((side, index) => {
    const points = side.points.map(fit);
    const cumulative = [0];
    for (let i = 1; i < points.length; i++) cumulative.push(cumulative[i - 1]! + dist(points[i - 1]!, points[i]!));
    const phase = phases[index]!;
    const partial: Side = {
      phaseIndex: index,
      kind: phase.kind,
      ms: phase.ms,
      points,
      cumulative,
      length: cumulative[cumulative.length - 1]!,
      straight: side.straight,
      middle: { x: 0, y: 0 },
      outward: { x: 0, y: 0 },
    };
    partial.middle = pointOnSide(partial, 0.5);
    partial.outward = outwardAt(partial, 0.5);
    return partial;
  });

  const starts: number[] = [];
  let total = 0;
  for (const side of sides) {
    starts.push(total);
    total += side.length;
  }
  return { sides, length: total, starts, exact };
}

/** Index of the segment that holds distance `target` along the side. */
function segmentAt(side: Side, target: number): number {
  let low = 0;
  let high = side.cumulative.length - 1;
  while (high - low > 1) {
    const mid = (low + high) >> 1;
    if (side.cumulative[mid]! <= target) low = mid;
    else high = mid;
  }
  return low;
}

/** The point `progress` (0 to 1) of the way along a side, measured by distance, so the dot moves evenly. */
export function pointOnSide(side: Side, progress: number): Point {
  const target = Math.min(1, Math.max(0, progress)) * side.length;
  const i = segmentAt(side, target);
  const a = side.points[i]!;
  const b = side.points[Math.min(i + 1, side.points.length - 1)]!;
  const span = side.cumulative[i + 1] !== undefined ? side.cumulative[i + 1]! - side.cumulative[i]! : 0;
  const t = span > 0 ? (target - side.cumulative[i]!) / span : 0;
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/** Unit vector pointing out of the shape at `progress` along a side (screen coordinates). */
function outwardAt(side: Side, progress: number): Point {
  const target = Math.min(1, Math.max(0, progress)) * side.length;
  const i = Math.min(segmentAt(side, target), side.points.length - 2);
  const a = side.points[i]!;
  const b = side.points[i + 1]!;
  const length = dist(a, b) || 1;
  // Outside is left of travel in y-up coordinates, which is (dy, -dx) once y points down.
  return { x: (b.y - a.y) / length, y: -(b.x - a.x) / length };
}

/** The point on the outline at a phase and the progress through it. */
export function pointAt(shape: Shape, phaseIndex: number, progress: number): Point {
  const side = shape.sides[Math.min(Math.max(0, phaseIndex), shape.sides.length - 1)]!;
  return pointOnSide(side, progress);
}

/** How far along the outline the dot is, from 0 to shape.length. */
export function distanceAt(shape: Shape, phaseIndex: number, progress: number): number {
  const i = Math.min(Math.max(0, phaseIndex), shape.sides.length - 1);
  return shape.starts[i]! + shape.sides[i]!.length * Math.min(1, Math.max(0, progress));
}

/** `count` points evenly spaced along the whole outline, from the start of the first side. For morphing. */
export function resample(shape: Shape, count: number): Point[] {
  const points: Point[] = [];
  let sideIndex = 0;
  for (let k = 0; k < count; k++) {
    const target = (shape.length * k) / count;
    while (sideIndex < shape.sides.length - 1 && target >= shape.starts[sideIndex + 1]!) sideIndex++;
    const side = shape.sides[sideIndex]!;
    const within = side.length > 0 ? (target - shape.starts[sideIndex]!) / side.length : 0;
    points.push(pointOnSide(side, within));
  }
  return points;
}

/** An SVG path through the whole outline. */
export function outlinePath(shape: Shape, digits = 4): string {
  const f = (n: number) => n.toFixed(digits);
  const parts: string[] = [];
  shape.sides.forEach((side, i) => {
    side.points.forEach((pt, j) => {
      if (i === 0 && j === 0) parts.push(`M${f(pt.x)} ${f(pt.y)}`);
      else if (j > 0) parts.push(`L${f(pt.x)} ${f(pt.y)}`);
    });
  });
  parts.push('Z');
  return parts.join('');
}

/** An SVG path through a list of points, closed. */
export function pointsPath(points: readonly Point[], digits = 4): string {
  const f = (n: number) => n.toFixed(digits);
  return points.map((pt, i) => `${i === 0 ? 'M' : 'L'}${f(pt.x)} ${f(pt.y)}`).join('') + 'Z';
}

/** "4 s", "5.5 s". */
export function secondsLabel(ms: number): string {
  const seconds = Math.round(ms / 100) / 10;
  return `${seconds} s`;
}
