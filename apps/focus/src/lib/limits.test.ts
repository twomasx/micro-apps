import { describe, expect, it } from 'vitest';
import {
  PREVIEW_MS,
  canSaveHistory,
  canUseCustomBeat,
  canUseNoise,
  clampPrimeMinutes,
  clampSessionMinutes,
  isPresetLocked,
  maxSessionMinutes,
  playbackLimit,
  primeMinutesOptions,
  sessionMinutesOptions,
} from './limits';
import { presets } from './presets';

const MINUTE = 60_000;
const free = { free: true };
const locked = { free: false };

describe('free tier', () => {
  it('allows sessions up to 10 minutes', () => {
    expect(maxSessionMinutes(false)).toBe(10);
    expect(sessionMinutesOptions(false)).toEqual([5, 10]);
    expect(clampSessionMinutes(90, false)).toBe(10);
    expect(clampSessionMinutes(7, false)).toBe(5);
    expect(clampSessionMinutes(1, false)).toBe(5);
    expect(clampSessionMinutes(Number.NaN, false)).toBe(5);
  });

  it('allows Prime mode at 10 minutes only', () => {
    expect(primeMinutesOptions(false)).toEqual([10]);
    expect(clampPrimeMinutes(20, false)).toBe(10);
  });

  it('locks Relaxed focus and Deep focus', () => {
    expect(presets.filter((p) => isPresetLocked(p, false)).map((p) => p.id)).toEqual(['relaxed', 'deep']);
  });

  it('plays a free preset at the asked length, capped at 10 minutes', () => {
    expect(playbackLimit(free, 5, false)).toEqual({ durationMs: 5 * MINUTE, preview: false });
    expect(playbackLimit(free, 45, false)).toEqual({ durationMs: 10 * MINUTE, preview: false });
  });

  it('plays a locked preset as a 60 second preview', () => {
    expect(PREVIEW_MS).toBe(60_000);
    expect(playbackLimit(locked, 10, false)).toEqual({ durationMs: 60_000, preview: true });
  });

  it('has no custom beat, noise layer or history', () => {
    expect(canUseCustomBeat(false)).toBe(false);
    expect(canUseNoise(false)).toBe(false);
    expect(canSaveHistory(false)).toBe(false);
  });
});

describe('lifetime unlock', () => {
  it('allows sessions up to 90 minutes', () => {
    expect(maxSessionMinutes(true)).toBe(90);
    expect(clampSessionMinutes(90, true)).toBe(90);
    expect(clampSessionMinutes(500, true)).toBe(90);
    expect(clampSessionMinutes(50, true)).toBe(45);
  });

  it('allows Prime mode at 10, 15 or 20 minutes', () => {
    expect(primeMinutesOptions(true)).toEqual([10, 15, 20]);
    expect(clampPrimeMinutes(17, true)).toBe(15);
    expect(clampPrimeMinutes(60, true)).toBe(20);
  });

  it('unlocks all five presets at full length', () => {
    expect(presets.some((p) => isPresetLocked(p, true))).toBe(false);
    expect(playbackLimit(locked, 60, true)).toEqual({ durationMs: 60 * MINUTE, preview: false });
  });

  it('has the custom beat, noise layer and history', () => {
    expect(canUseCustomBeat(true)).toBe(true);
    expect(canUseNoise(true)).toBe(true);
    expect(canSaveHistory(true)).toBe(true);
  });
});
