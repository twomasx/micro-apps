import { describe, expect, it } from 'vitest';
import { hexToRgb } from './color.ts';
import { colorName, pairNames } from './color-names.ts';
import { DEFAULT_CHOICE, pairFor, sanitizeChoice } from './color-settings.ts';
import { fanRadius, fanSpots, MIN_SWATCH, START_DEG, swatchSize, SWATCH } from './fan.ts';
import { PRESET_PAIRS } from './pairs.ts';

describe('color names', () => {
  it.each([
    ['#ff0000', 'Red'],
    ['#ff8000', 'Orange'],
    ['#ffff00', 'Yellow'],
    ['#00c000', 'Green'],
    ['#00bfbf', 'Cyan'],
    ['#0000ff', 'Blue'],
    ['#1e2a78', 'Deep blue'],
    ['#3b82f6', 'Blue'],
    ['#ff00ff', 'Magenta'],
    ['#ffffff', 'White'],
    ['#000000', 'Black'],
    ['#808080', 'Gray'],
    ['#ffe4ec', 'Pale pink'],
  ])('%s is %s', (hex, name) => {
    expect(colorName(hexToRgb(hex))).toBe(name);
  });

  it('never gives a custom pair the same two names', () => {
    expect(pairNames(hexToRgb('#3b82f6'), hexToRgb('#1d4ed8'))).toEqual(['Light blue', 'Dark blue']);
    expect(pairNames(hexToRgb('#3b82f6'), hexToRgb('#3b82f6'))).toEqual(['Left color', 'Right color']);
    expect(pairNames(hexToRgb('#ff0000'), hexToRgb('#0000ff'))).toEqual(['Red', 'Blue']);
  });
});

describe('saved color choice', () => {
  it('keeps valid choices and falls back for anything else', () => {
    expect(sanitizeChoice({ kind: 'preset', id: 'rose-navy' })).toEqual({ kind: 'preset', id: 'rose-navy' });
    expect(sanitizeChoice({ kind: 'custom', left: '#AABBCC', right: '#000000' })).toEqual({
      kind: 'custom',
      left: '#aabbcc',
      right: '#000000',
    });
    for (const bad of [null, 'x', {}, { kind: 'preset', id: 'nope' }, { kind: 'custom', left: 'red', right: '#000000' }]) {
      expect(sanitizeChoice(bad)).toEqual(DEFAULT_CHOICE);
    }
  });

  it('turns a choice into a pair', () => {
    expect(pairFor({ kind: 'preset', id: 'day-night' })).toBe(PRESET_PAIRS[5]);
    expect(pairFor({ kind: 'custom', left: '#ff0000', right: '#3b82f6' })).toEqual({
      id: 'custom',
      left: { name: 'Red', hex: '#ff0000' },
      right: { name: 'Blue', hex: '#3b82f6' },
    });
  });
});

describe('the fan', () => {
  it('spreads swatches from just above the Begin row to straight up, with room between them', () => {
    const count = PRESET_PAIRS.length + 1;
    const radius = fanRadius(count);
    const spots = fanSpots(count, radius);
    const start = (START_DEG * Math.PI) / 180;
    expect(spots[0]).toEqual({ x: Math.round(Math.cos(start) * radius), y: Math.round(Math.sin(start) * radius) });
    // Clear of the 56 px Begin button beside the dot.
    expect(-spots[0]!.y).toBeGreaterThan(28 + SWATCH / 2);
    expect(spots.at(-1)!.x).toBe(0);
    expect(spots.at(-1)!.y).toBe(-radius);
    for (let i = 1; i < spots.length; i++) {
      const d = Math.hypot(spots[i]!.x - spots[i - 1]!.x, spots[i]!.y - spots[i - 1]!.y);
      expect(d).toBeGreaterThanOrEqual(SWATCH + 4);
    }
  });

  it.each([320, 360, 375, 412])('fits on a %i px phone: no swatch past the left edge, none overlapping', (width) => {
    // The dot's center sits 22 px gutter + 28 px from the right edge.
    const dotX = width - 22 - 28;
    const count = PRESET_PAIRS.length + 1;
    const radius = fanRadius(count, dotX);
    const size = swatchSize(count, radius);
    const spots = fanSpots(count, radius);
    expect(size).toBeGreaterThanOrEqual(MIN_SWATCH);
    expect(dotX + Math.min(...spots.map((s) => s.x)) - size / 2).toBeGreaterThanOrEqual(0);
    for (let i = 1; i < spots.length; i++) {
      expect(Math.hypot(spots[i]!.x - spots[i - 1]!.x, spots[i]!.y - spots[i - 1]!.y)).toBeGreaterThanOrEqual(size);
    }
    if (width >= 360) expect(size).toBe(SWATCH);
  });
});
