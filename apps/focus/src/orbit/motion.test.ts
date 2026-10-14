import { describe, expect, it } from 'vitest';
import { presets } from '../lib/presets';
import { MAX_VISUAL_HZ, REDUCED_MOTION_HZ, approach, closing, hexToRgb, rgba, visualRate } from './motion';

describe('visualRate (safety)', () => {
  it('never turns faster than 0.6 times per second, for any beat from 1 to 40 Hz', () => {
    for (let beat = 1; beat <= 40; beat += 0.5) {
      expect(visualRate(beat)).toBeLessThanOrEqual(MAX_VISUAL_HZ);
      expect(visualRate(beat)).toBeGreaterThan(0);
    }
    expect(MAX_VISUAL_HZ).toBe(0.6);
  });

  it('stays far below the 3 Hz where flashing becomes a seizure risk, even for bad input', () => {
    for (const beat of [0, -5, 1000, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(visualRate(beat)).toBeLessThanOrEqual(MAX_VISUAL_HZ);
    }
  });

  it('is faster for a faster beat, so presets look different', () => {
    const rates = presets.map((p) => visualRate(p.beat));
    expect([...rates].sort((a, b) => a - b)).toEqual(rates);
    expect(new Set(rates).size).toBe(rates.length);
  });

  it('is very slow with reduced motion, whatever the beat', () => {
    expect(visualRate(40, true)).toBe(REDUCED_MOTION_HZ);
    expect(visualRate(2, true)).toBe(REDUCED_MOTION_HZ);
  });
});

describe('approach', () => {
  it('eases toward the target and never jumps past it', () => {
    let value = 0;
    let previous = 0;
    for (let i = 0; i < 120; i++) {
      value = approach(value, 1, 1 / 60, 0.6);
      expect(value).toBeGreaterThan(previous);
      expect(value).toBeLessThan(1);
      previous = value;
    }
    // After 2 seconds with a 0.6 s time constant it is 96% of the way.
    expect(value).toBeCloseTo(0.964, 2);
  });

  it('gives the same result at 30 and 60 frames per second', () => {
    let a = 0;
    let b = 0;
    for (let i = 0; i < 60; i++) a = approach(a, 1, 1 / 60, 0.5);
    for (let i = 0; i < 30; i++) b = approach(b, 1, 1 / 30, 0.5);
    expect(a).toBeCloseTo(b, 10);
  });
});

describe('closing', () => {
  const TEN_MIN = 600_000;
  it('is 0 until the last minute and 1 at the end', () => {
    expect(closing(TEN_MIN, TEN_MIN)).toBe(0);
    expect(closing(60_000, TEN_MIN)).toBe(0);
    expect(closing(30_000, TEN_MIN)).toBe(0.5);
    expect(closing(0, TEN_MIN)).toBe(1);
  });

  it('is off for the 60 second preview', () => {
    expect(closing(10_000, 60_000)).toBe(0);
  });
});

describe('colours', () => {
  it('reads hex and writes rgba', () => {
    expect(hexToRgb('#e6c88f')).toEqual([230, 200, 143]);
    expect(rgba([230.4, 200, 143], 0.5)).toBe('rgba(230,200,143,0.5)');
  });
});
