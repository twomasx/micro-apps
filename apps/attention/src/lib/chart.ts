/** Geometry for the ink line charts. One series, one axis. */

export interface ChartBox {
  width: number;
  height: number;
  /** Room for value labels above the line and the x labels below. */
  padTop: number;
  padBottom: number;
  padX: number;
}

export interface ChartPoint {
  x: number;
  y: number;
}

/** Spreads values evenly across the box, oldest on the left. */
export function chartPoints(values: readonly number[], domain: readonly [number, number], box: ChartBox): ChartPoint[] {
  const [lo, hi] = domain;
  const span = hi - lo || 1;
  const innerW = box.width - 2 * box.padX;
  const innerH = box.height - box.padTop - box.padBottom;
  return values.map((v, i) => ({
    x: box.padX + (values.length === 1 ? innerW / 2 : (innerW * i) / (values.length - 1)),
    y: box.padTop + innerH * (1 - (Math.min(hi, Math.max(lo, v)) - lo) / span),
  }));
}

/** Scores: a window around the results, in steps of 10, inside 0 to 100. Change stays visible. */
export function scoreDomain(values: readonly number[]): [number, number] {
  if (values.length === 0) return [0, 100];
  const lo = Math.max(0, Math.floor((Math.min(...values) - 10) / 10) * 10);
  const hi = Math.min(100, Math.ceil((Math.max(...values) + 10) / 10) * 10);
  return [lo, Math.max(hi, lo + 20)];
}

/** Durations: from zero, so a stretch twice as long sits twice as high. */
export function secondsDomain(values: readonly number[]): [number, number] {
  const max = Math.max(10, ...values);
  return [0, Math.ceil((max * 1.15) / 10) * 10];
}

/** Which points get a printed value: the first, the last and the highest. Never all of them. */
export function labelledIndexes(values: readonly number[]): number[] {
  if (values.length === 0) return [];
  let best = 0;
  values.forEach((v, i) => {
    if (v > values[best]!) best = i;
  });
  return [...new Set([0, best, values.length - 1])].sort((a, b) => a - b);
}

/**
 * Whether a printed value sits above its point (true) or below it. Above, unless a neighbor
 * is higher on that side the label would sit, where the line would run through it.
 */
export function labelAbove(values: readonly number[], i: number): boolean {
  const v = values[i]!;
  const prev = values[i - 1];
  const next = values[i + 1];
  if (i === 0) return next === undefined || next <= v;
  if (i === values.length - 1) return prev === undefined || prev <= v;
  return true;
}

/** The point nearest to a pointer's x position. */
export function nearestIndex(points: readonly ChartPoint[], x: number): number {
  let best = 0;
  points.forEach((p, i) => {
    if (Math.abs(p.x - x) < Math.abs(points[best]!.x - x)) best = i;
  });
  return best;
}
