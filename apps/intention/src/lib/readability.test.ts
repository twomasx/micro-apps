import { describe, expect, it } from 'vitest';
import { contrast, hexToRgb, type Rgb } from './color.ts';
import { DISTINCT, hardToTellApart, pairDistances, simulate } from './colorblind.ts';
import { pairName, PRESET_PAIRS } from './pairs.ts';
import { AA_LARGE, AA_TEXT, brightest, shadingFor, textContrast } from './readability.ts';

describe('contrast math', () => {
  it('matches the WCAG reference values', () => {
    expect(contrast([255, 255, 255], [0, 0, 0])).toBeCloseTo(21, 6);
    expect(contrast([255, 255, 255], [255, 255, 255])).toBeCloseTo(1, 6);
    // #767676 on white is the classic 4.54:1.
    expect(contrast(hexToRgb('#767676'), [255, 255, 255])).toBeCloseTo(4.54, 2);
  });
});

/** Every pair's text clears AA over the brightest either color can get. */
function checkPair(left: Rgb, right: Rgb) {
  const shading = shadingFor(left, right);
  for (const color of [left, right]) {
    const bottom = textContrast(brightest(color), shading.bottom);
    expect(bottom.white).toBeGreaterThanOrEqual(AA_TEXT);
    expect(bottom.muted).toBeGreaterThanOrEqual(AA_TEXT);
    expect(textContrast(brightest(color), shading.top).white).toBeGreaterThanOrEqual(AA_LARGE);
  }
  return shading;
}

describe('automatic edge shading', () => {
  it.each(PRESET_PAIRS.map((pair) => [pairName(pair), pair] as const))('%s reads at AA', (_, pair) => {
    checkPair(hexToRgb(pair.left.hex), hexToRgb(pair.right.hex));
  });

  it('holds for custom pairs, including white on white', () => {
    const extremes: Rgb[] = [
      [255, 255, 255],
      [0, 0, 0],
      [255, 255, 0],
      [0, 255, 255],
      [0, 255, 0],
    ];
    for (const a of extremes) for (const b of extremes) checkPair(a, b);
    // A fixed spread of colors across the cube.
    for (let i = 0; i < 400; i++) {
      const c = (k: number): Rgb => [(i * 37 + k * 11) % 256, (i * 91 + k * 53) % 256, (i * 151 + k * 29) % 256];
      checkPair(c(1), c(2));
    }
  });

  it('dark pairs keep the lightest Night shading', () => {
    expect(shadingFor(hexToRgb('#25366a'), hexToRgb('#1b1b1f'))).toEqual({ bottom: 0.45, top: 0.3 });
  });

  it('light pairs get more', () => {
    const day = shadingFor(hexToRgb('#f1efe9'), hexToRgb('#1b1b1f'));
    expect(day.bottom).toBeGreaterThan(0.45);
    expect(day.top).toBeGreaterThan(0.3);
  });
});

describe('red-green color blindness', () => {
  it('simulation leaves gray alone and merges red with green for protanopia', () => {
    const gray: Rgb = [128, 128, 128];
    for (const vision of ['protanopia', 'deuteranopia'] as const) {
      const sim = simulate(gray, vision);
      sim.forEach((v, i) => expect(v).toBeCloseTo(gray[i]!, 0));
    }
    const red = pairDistances([200, 60, 60], [90, 120, 60]);
    expect(red.typical).toBeGreaterThan(red.protanopia);
  });

  it.each(PRESET_PAIRS.map((pair) => [pairName(pair), pair] as const))('%s stays easy to tell apart', (_, pair) => {
    const distances = pairDistances(hexToRgb(pair.left.hex), hexToRgb(pair.right.hex));
    console.log(
      `${pairName(pair).padEnd(24)} typical ${distances.typical.toFixed(3)}  protanopia ${distances.protanopia.toFixed(3)}  deuteranopia ${distances.deuteranopia.toFixed(3)}`,
    );
    expect(hardToTellApart(hexToRgb(pair.left.hex), hexToRgb(pair.right.hex))).toEqual([]);
    expect(Math.min(distances.protanopia, distances.deuteranopia)).toBeGreaterThanOrEqual(DISTINCT);
  });

  it('flags a pair that only differs in red and green', () => {
    expect(hardToTellApart(hexToRgb('#c0504d'), hexToRgb('#7a8c3a'))).not.toEqual([]);
  });
});
