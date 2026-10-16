import { describe, expect, it } from 'vitest';
import { deviationOf, liveZ, runZ, type Aim } from './scoring.ts';
import { arrowFor, bitFavorsYou, seamPosition, SEAM_TRAVEL, travelDirection, yourShare } from './tug.ts';

/**
 * Direction consistency: if the bits favor your color, your color grows, the seam moves the way
 * your arrow points and the score is positive. Always. Checked for both colors in both directions.
 */

const AIMS: Aim[] = ['left', 'right'];
const LENGTH = 4000;

/** A run of `n` bits where `favoring` of them help the given aim. */
function bitsFor(aim: Aim, n: number, favoring: number): number[] {
  const helpful = aim === 'right' ? 1 : 0;
  return Array.from({ length: n }, (_, i) => (i < favoring ? helpful : 1 - helpful));
}

/** Which way the seam moved from the middle, as the arrow would show it. */
function seamMove(seam: number): '←' | '→' | 'none' {
  return seam < 0.5 ? '←' : seam > 0.5 ? '→' : 'none';
}

describe.each(AIMS)('your color is the %s color', (aim) => {
  it('the arrow points the way your color travels', () => {
    expect(arrowFor(aim)).toBe(aim === 'right' ? '←' : '→');
    expect(travelDirection(aim)).toBe(aim === 'right' ? 'toward-left' : 'toward-right');
  });

  it.each([
    ['all bits favor you', 4000],
    ['most bits favor you', 2150],
    ['slightly more favor you', 2010],
  ])('%s: your color grows, the seam follows the arrow, the score is positive', (_, favoring) => {
    const bits = bitsFor(aim, LENGTH, favoring);
    const deviation = deviationOf(bits);
    const seam = seamPosition(deviation, bits.length);
    expect(yourShare(aim, seam)).toBeGreaterThan(0.5);
    expect(seamMove(seam)).toBe(arrowFor(aim));
    expect(liveZ(deviation, aim, bits.length)).toBeGreaterThan(0);
    expect(runZ(deviation, aim, LENGTH)).toBeGreaterThan(0);
  });

  it.each([
    ['all bits favor the other color', 0],
    ['most bits favor the other color', 1850],
    ['slightly more favor the other color', 1990],
  ])('%s: your color shrinks, the seam moves against the arrow, the score is negative', (_, favoring) => {
    const bits = bitsFor(aim, LENGTH, favoring);
    const deviation = deviationOf(bits);
    const seam = seamPosition(deviation, bits.length);
    expect(yourShare(aim, seam)).toBeLessThan(0.5);
    expect(seamMove(seam)).not.toBe(arrowFor(aim));
    expect(seamMove(seam)).not.toBe('none');
    expect(liveZ(deviation, aim, bits.length)).toBeLessThan(0);
    expect(runZ(deviation, aim, LENGTH)).toBeLessThan(0);
  });

  it('an even split leaves the seam in the middle and the score at 0', () => {
    const deviation = deviationOf(bitsFor(aim, LENGTH, 2000));
    expect(seamPosition(deviation, LENGTH)).toBe(0.5);
    expect(runZ(deviation, aim, LENGTH)).toBe(0);
  });

  it('every single bit agrees: a helpful bit moves the seam your way, an unhelpful one the other way', () => {
    for (const bit of [0, 1]) {
      const seam = seamPosition(deviationOf([bit]), 1);
      const helps = bitFavorsYou(bit, aim);
      expect(yourShare(aim, seam) > 0.5).toBe(helps);
      expect(liveZ(deviationOf([bit]), aim, 1) > 0).toBe(helps);
    }
  });

  it('at every point of a run, your share and the live score agree in sign', () => {
    // A run that swings both ways.
    const bits = [...bitsFor(aim, 300, 300), ...bitsFor(aim, 900, 0), ...bitsFor(aim, 800, 800)];
    let deviation = 0;
    bits.forEach((bit, i) => {
      deviation += bit ? 1 : -1;
      const share = yourShare(aim, seamPosition(deviation, i + 1));
      const z = liveZ(deviation, aim, i + 1);
      expect(Math.sign(share - 0.5)).toBe(Math.sign(z));
    });
  });
});

describe('honest motion', () => {
  it('the seam comes straight from the score and stops at ±3', () => {
    // Score +1.5 (1s lead): the right color has moved the seam halfway to its limit.
    expect(seamPosition(150, 10_000)).toBeCloseTo(0.5 - SEAM_TRAVEL / 2, 10);
    expect(seamPosition(300, 10_000)).toBeCloseTo(0.5 - SEAM_TRAVEL, 10);
    expect(seamPosition(4000, 4000)).toBeCloseTo(0.5 - SEAM_TRAVEL, 10);
    expect(seamPosition(-4000, 4000)).toBeCloseTo(0.5 + SEAM_TRAVEL, 10);
    expect(seamPosition(0, 0)).toBe(0.5);
  });
});
