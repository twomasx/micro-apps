import { describe, expect, it } from 'vitest';
import { clampStretch, nextStretch, STAIRCASE } from './staircase';

describe('stretch staircase', () => {
  it('starts at 20 s, as in the paper', () => {
    expect(STAIRCASE.firstSeconds).toBe(20);
  });

  it('adds 10% after "I stayed"', () => {
    expect(nextStretch(20, true)).toBe(22);
    expect(nextStretch(100, true)).toBe(110);
  });

  it('takes away 20% after "I drifted"', () => {
    expect(nextStretch(20, false)).toBe(16);
    expect(nextStretch(100, false)).toBe(80);
  });

  it('always adds at least 1 s after a yes', () => {
    expect(nextStretch(10, true)).toBe(11);
    expect(nextStretch(14, true)).toBe(15);
  });

  it('never goes below 10 s or above 10 minutes', () => {
    expect(nextStretch(11, false)).toBe(10);
    expect(nextStretch(10, false)).toBe(10);
    expect(nextStretch(590, true)).toBe(600);
    expect(nextStretch(600, true)).toBe(600);
  });

  it('keeps lengths in whole seconds', () => {
    let length: number = STAIRCASE.firstSeconds;
    for (const stayed of [true, true, false, true, false, false, true]) {
      length = nextStretch(length, stayed);
      expect(Number.isInteger(length)).toBe(true);
    }
  });

  it('repairs a broken saved length', () => {
    expect(clampStretch(Number.NaN)).toBe(20);
    expect(clampStretch(3)).toBe(10);
    expect(clampStretch(12.4)).toBe(12);
  });

  it('reaches minutes after a run of yeses, like the study', () => {
    let length: number = STAIRCASE.firstSeconds;
    for (let i = 0; i < 30; i++) length = nextStretch(length, true);
    expect(length).toBeGreaterThan(300);
  });
});
