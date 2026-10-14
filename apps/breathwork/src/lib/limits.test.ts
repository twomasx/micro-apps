import { describe, expect, it } from 'vitest';
import {
  canSaveCustom,
  canSeeWeek,
  clampMinutes,
  isTechniqueLocked,
  minuteOptions,
  PREVIEW_MS,
  sessionPlan,
  wholeBreathsMs,
} from './limits';
import { findTechnique } from './techniques';

const sigh = findTechnique('sigh')!;
const box = findTechnique('box')!;
const fourSevenEight = findTechnique('478')!;
const resonant = findTechnique('resonant')!;

describe('session lengths', () => {
  it('offers 1, 3 and 5 minutes free and adds 10, 15 and 20 with the unlock', () => {
    expect(minuteOptions(false)).toEqual([1, 3, 5]);
    expect(minuteOptions(true)).toEqual([1, 3, 5, 10, 15, 20]);
  });

  it('brings a paid length down to the longest free one', () => {
    expect(clampMinutes(20, false)).toBe(5);
    expect(clampMinutes(20, true)).toBe(20);
    expect(clampMinutes(12, true)).toBe(10);
    expect(clampMinutes(0, false)).toBe(1);
    expect(clampMinutes(Number.NaN, false)).toBe(5);
  });
});

describe('whole breaths', () => {
  it('rounds a session to whole breaths so it never stops mid-breath', () => {
    expect(wholeBreathsMs(5 * 60_000, sigh)).toBe(33 * 9000);
    expect(wholeBreathsMs(5 * 60_000, box)).toBe(19 * 16000);
    expect(wholeBreathsMs(60_000, fourSevenEight)).toBe(3 * 19000);
  });

  it('is always at least one breath', () => {
    expect(wholeBreathsMs(1000, fourSevenEight)).toBe(19000);
  });
});

describe('free and locked', () => {
  it('locks Resonant for free users only', () => {
    expect(isTechniqueLocked(resonant, false)).toBe(true);
    expect(isTechniqueLocked(resonant, true)).toBe(false);
    expect(isTechniqueLocked(box, false)).toBe(false);
  });

  it('gives a locked technique a one minute preview, rounded to whole breaths', () => {
    expect(sessionPlan(resonant, 20, false)).toEqual({ durationMs: wholeBreathsMs(PREVIEW_MS, resonant), preview: true });
    expect(sessionPlan(resonant, 20, false).durationMs).toBe(55_000);
  });

  it('runs a free technique for the chosen length within the limits', () => {
    expect(sessionPlan(box, 3, false)).toEqual({ durationMs: wholeBreathsMs(180_000, box), preview: false });
    expect(sessionPlan(box, 20, false).durationMs).toBe(wholeBreathsMs(300_000, box));
    expect(sessionPlan(resonant, 20, true)).toEqual({ durationMs: wholeBreathsMs(1_200_000, resonant), preview: false });
  });

  it('keeps custom patterns and the week view for the unlock', () => {
    expect(canSaveCustom(false)).toBe(false);
    expect(canSaveCustom(true)).toBe(true);
    expect(canSeeWeek(false)).toBe(false);
    expect(canSeeWeek(true)).toBe(true);
  });
});
