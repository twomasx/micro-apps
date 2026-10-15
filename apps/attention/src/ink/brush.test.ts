import { describe, expect, it } from 'vitest';
import { bodyShare, bristleInks, buildLineStroke, buildStroke, drynessAt, lineDrynessAt, STROKE_WIDTH, SWEEP_MAX, SWEEP_MIN, valueNoise, widthAt } from './brush';

describe('enso brush', () => {
  it('draws the same stroke for the same seed, and a different one for another', () => {
    expect(buildStroke(4.2)).toEqual(buildStroke(4.2));
    expect(buildStroke(4.2).samples[200]).not.toEqual(buildStroke(9.1).samples[200]);
  });

  it('leaves an open gap, like an enso', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const { samples } = buildStroke(seed);
      const first = samples[0]!;
      const last = samples[samples.length - 1]!;
      const gap = Math.hypot(first.x - last.x, first.y - last.y);
      // Chord of the missing arc, on a unit circle.
      expect(gap).toBeGreaterThan(2 * Math.sin(Math.PI * (1 - SWEEP_MAX)) * 0.8);
      expect(gap).toBeLessThan(2 * Math.sin(Math.PI * (1 - SWEEP_MIN)) * 1.3);
    }
  });

  it('stays close to a circle', () => {
    for (const s of buildStroke(7).samples) {
      expect(Math.hypot(s.x, s.y)).toBeGreaterThan(0.9);
      expect(Math.hypot(s.x, s.y)).toBeLessThan(1.1);
    }
  });

  it('lands narrow, presses wider, holds its width, then narrows toward the lift', () => {
    expect(widthAt(0, 0.5)).toBeLessThan(widthAt(0.3, 0.5));
    expect(widthAt(0.035, 0.5)).toBeGreaterThan(widthAt(0.3, 0.5));
    expect(widthAt(0.3, 0.5)).toBeCloseTo(STROKE_WIDTH / 2, 3);
    expect(widthAt(1, 0.5)).toBeLessThan(widthAt(0.3, 0.5) * 0.7);
  });

  it('is wet for the first part and dry at the end', () => {
    expect(drynessAt(0.2)).toBe(0);
    expect(drynessAt(0.42)).toBe(0);
    expect(drynessAt(1)).toBeGreaterThan(0.8);
  });

  it('hands over from solid body to bristles gradually', () => {
    expect(bodyShare(0)).toBe(1);
    expect(bodyShare(0.17)).toBeGreaterThan(0.3);
    expect(bodyShare(0.17)).toBeLessThan(0.7);
    expect(bodyShare(0.5)).toBe(0);
  });

  it('breaks bristles only where the brush is dry', () => {
    const { samples, bristles } = buildStroke(3);
    const wet = samples.filter((s) => s.t < 0.42);
    const dry = samples.filter((s) => s.t > 0.95);
    for (const bristle of bristles) for (const s of wet) expect(bristleInks(bristle, s)).toBe(true);
    let skipped = 0;
    for (const bristle of bristles) for (const s of dry) if (!bristleInks(bristle, s)) skipped++;
    expect(skipped / (bristles.length * dry.length)).toBeGreaterThan(0.4);
  });

  it('has smooth noise in [0, 1]', () => {
    for (let x = 0; x < 20; x += 0.37) {
      const v = valueNoise(11, x);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
      expect(Math.abs(valueNoise(11, x + 0.01) - v)).toBeLessThan(0.05);
    }
  });
});

describe('ink line', () => {
  const points = [
    { x: 0, y: 50 },
    { x: 100, y: 20 },
    { x: 200, y: 40 },
  ];

  it('passes close to every point', () => {
    const { samples } = buildLineStroke(points, 3, 4);
    for (const p of points) {
      const nearest = Math.min(...samples.map((s) => Math.hypot(s.x - p.x, s.y - p.y)));
      expect(nearest).toBeLessThan(3);
    }
  });

  it('is wet for most of its length and dry only at the end', () => {
    expect(lineDrynessAt(0.5)).toBe(0);
    expect(lineDrynessAt(0.8)).toBe(0);
    expect(lineDrynessAt(1)).toBeGreaterThan(0.8);
  });

  it('keeps about the width asked for', () => {
    const { maxHalf } = buildLineStroke(points, 3, 6);
    expect(maxHalf).toBeGreaterThan(2.5);
    expect(maxHalf).toBeLessThan(5);
  });

  it('draws nothing for a single point', () => {
    expect(buildLineStroke([{ x: 0, y: 0 }], 1, 4).samples).toEqual([]);
  });
});
