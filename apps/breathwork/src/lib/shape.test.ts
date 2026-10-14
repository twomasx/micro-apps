import { describe, expect, it } from 'vitest';
import { CUSTOM_FIELDS, customToTechnique, MAX_PHASE_SECONDS, MIN_BREATH_SECONDS, type CustomPattern } from './custom';
import { buildShape, distanceAt, outlinePath, pointAt, resample, secondsLabel, type Shape, type Side } from './shape';
import { findTechnique, techniques, type Technique } from './techniques';

const shapeOf = (id: string) => buildShape(findTechnique(id)!.phases);
const first = (side: Side) => side.points[0]!;
const last = (side: Side) => side.points[side.points.length - 1]!;

/** Each side's length divided by its seconds: all equal when the shape is in proportion. */
function ratios(shape: Shape): number[] {
  return shape.sides.map((side) => side.length / (side.ms / 1000));
}

function expectProportional(shape: Shape) {
  const r = ratios(shape);
  for (const value of r) expect(value / r[0]!).toBeCloseTo(1, 3);
}

function expectClosedAndInBox(shape: Shape) {
  const start = first(shape.sides[0]!);
  expect(last(shape.sides[shape.sides.length - 1]!).x).toBeCloseTo(start.x, 6);
  expect(last(shape.sides[shape.sides.length - 1]!).y).toBeCloseTo(start.y, 6);
  for (const side of shape.sides) {
    for (const pt of side.points) {
      expect(pt.x).toBeGreaterThanOrEqual(-1e-9);
      expect(pt.x).toBeLessThanOrEqual(1 + 1e-9);
      expect(pt.y).toBeGreaterThanOrEqual(-1e-9);
      expect(pt.y).toBeLessThanOrEqual(1 + 1e-9);
    }
  }
}

/** On screen y points down, so going up means y gets smaller. */
function expectDirections(shape: Shape) {
  for (const side of shape.sides) {
    const rise = first(side).y - last(side).y;
    if (side.kind === 'in') expect(rise).toBeGreaterThan(0);
    if (side.kind === 'out') expect(rise).toBeLessThan(0);
    if (side.kind === 'hold' && side.straight) expect(Math.abs(rise)).toBeLessThan(1e-6);
  }
}

describe('Box', () => {
  const shape = shapeOf('box');

  it('is a square of four straight, equal sides', () => {
    expect(shape.sides).toHaveLength(4);
    expect(shape.sides.every((s) => s.straight)).toBe(true);
    expectProportional(shape);
    expect(shape.exact).toBe(true);
  });

  it('goes up, across the top, down, and back along the bottom', () => {
    const [up, top, down, bottom] = shape.sides;
    expect(first(up!)).toEqual({ x: 0, y: 1 });
    expect(last(up!).x).toBeCloseTo(0);
    expect(last(up!).y).toBeCloseTo(0);
    expect(last(top!).x).toBeCloseTo(1);
    expect(last(down!).y).toBeCloseTo(1);
    expect(last(bottom!).x).toBeCloseTo(0);
    expectDirections(shape);
  });
});

describe('4-7-8', () => {
  const shape = shapeOf('478');

  it('is a triangle with straight sides of 4, 7 and 8', () => {
    expect(shape.sides).toHaveLength(3);
    expect(shape.sides.every((s) => s.straight)).toBe(true);
    expectProportional(shape);
    expect(shape.exact).toBe(true);
  });

  it('holds flat along the top and breathes out on the long diagonal', () => {
    expectDirections(shape);
    const hold = shape.sides[1]!;
    expect(first(hold).y).toBeCloseTo(last(hold).y, 6);
    expect(last(hold).x).toBeGreaterThan(first(hold).x);
  });
});

describe('Cyclic sigh', () => {
  const shape = shapeOf('sigh');

  it('is two straight climbs and one long curved slide down', () => {
    const [climb, topUp, slide] = shape.sides;
    expect(climb!.straight).toBe(true);
    expect(topUp!.straight).toBe(true);
    expect(slide!.straight).toBe(false);
    expectDirections(shape);
    expectProportional(shape);
    expect(shape.exact).toBe(true);
  });

  it('makes the top-up a gentler climb than the first breath in', () => {
    const slope = (s: Side) => (first(s).y - last(s).y) / Math.abs(last(s).x - first(s).x);
    expect(slope(shape.sides[1]!)).toBeLessThan(slope(shape.sides[0]!));
  });
});

describe('Resonant', () => {
  const shape = shapeOf('resonant');

  it('is a leaf of two equal curved sides, up then down', () => {
    expect(shape.sides).toHaveLength(2);
    expect(shape.sides.every((s) => !s.straight)).toBe(true);
    expectProportional(shape);
    expectDirections(shape);
  });
});

describe('every technique', () => {
  it.each(techniques.map((t): [string, Technique] => [t.id, t]))('%s is closed, inside the box and centred', (_, t) => {
    const shape = buildShape(t.phases);
    expectClosedAndInBox(shape);
    const pts = shape.sides.flatMap((s) => s.points);
    const width = Math.max(...pts.map((p) => p.x)) - Math.min(...pts.map((p) => p.x));
    const height = Math.max(...pts.map((p) => p.y)) - Math.min(...pts.map((p) => p.y));
    expect(Math.max(width, height)).toBeCloseTo(1, 6);
  });

  it('labels each side with an outward direction', () => {
    const box = shapeOf('box');
    expect(box.sides[0]!.outward.x).toBeCloseTo(-1); // left side points left
    expect(box.sides[1]!.outward.y).toBeCloseTo(-1); // top points up
    expect(box.sides[2]!.outward.x).toBeCloseTo(1);
    expect(box.sides[3]!.outward.y).toBeCloseTo(1);
  });
});

describe('custom patterns', () => {
  const values = [0, 1, 2, 4, 6.5, 12];
  const patterns: CustomPattern[] = [];
  for (const i of values.filter((v) => v >= MIN_BREATH_SECONDS))
    for (const hi of values)
      for (const o of values.filter((v) => v >= MIN_BREATH_SECONDS))
        for (const ho of values) patterns.push({ in: i, holdIn: hi, out: o, holdOut: ho });

  it(`every pattern from 0 to ${MAX_PHASE_SECONDS} s is closed, in proportion and in the right directions`, () => {
    expect(CUSTOM_FIELDS).toHaveLength(4);
    for (const pattern of patterns) {
      const shape = buildShape(customToTechnique(pattern).phases);
      expectClosedAndInBox(shape);
      expectProportional(shape);
      expectDirections(shape);
      expect(shape.exact).toBe(true);
    }
  });

  it('draws 4-2-6-2 with a straight breath in and a bowed, longer breath out', () => {
    const shape = buildShape(customToTechnique({ in: 4, holdIn: 2, out: 6, holdOut: 2 }).phases);
    expect(shape.sides[0]!.straight).toBe(true);
    expect(shape.sides[2]!.straight).toBe(false);
  });
});

describe('moving along the shape', () => {
  const box = shapeOf('box');

  it('puts the dot at the corners at the start and end of each side', () => {
    expect(pointAt(box, 0, 0)).toEqual({ x: 0, y: 1 });
    expect(pointAt(box, 0, 1).y).toBeCloseTo(0);
    expect(pointAt(box, 1, 0.5).x).toBeCloseTo(0.5);
  });

  it('moves evenly by distance, also on curves', () => {
    const sigh = shapeOf('sigh');
    const slide = sigh.sides[2]!;
    const steps = 20;
    const gaps: number[] = [];
    for (let k = 0; k < steps; k++) {
      const a = pointAt(sigh, 2, k / steps);
      const b = pointAt(sigh, 2, (k + 1) / steps);
      gaps.push(Math.hypot(b.x - a.x, b.y - a.y));
    }
    for (const gap of gaps) expect(gap / (slide.length / steps)).toBeCloseTo(1, 1);
  });

  it('measures how far along the outline the dot is', () => {
    expect(distanceAt(box, 0, 0)).toBe(0);
    expect(distanceAt(box, 2, 0.5)).toBeCloseTo(box.length * (2.5 / 4));
    expect(distanceAt(box, 9, 2)).toBeCloseTo(box.length);
  });

  it('resamples any shape to the same number of points, starting at the start', () => {
    const points = resample(shapeOf('478'), 120);
    expect(points).toHaveLength(120);
    expect(points[0]).toEqual(pointAt(shapeOf('478'), 0, 0));
  });

  it('writes an SVG path', () => {
    expect(outlinePath(box)).toMatch(/^M0\.0000 1\.0000L.*Z$/);
  });
});

describe('secondsLabel', () => {
  it('keeps the unit and half seconds', () => {
    expect(secondsLabel(4000)).toBe('4 s');
    expect(secondsLabel(5500)).toBe('5.5 s');
  });
});
