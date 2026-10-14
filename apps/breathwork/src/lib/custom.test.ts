import { describe, expect, it } from 'vitest';
import {
  addSavedPattern,
  clampCustomValue,
  customName,
  customProblems,
  customToTechnique,
  isValidCustom,
  MAX_SAVED_PATTERNS,
  removeSavedPattern,
  sanitizeSavedPatterns,
  type CustomPattern,
} from './custom';
import { breathAt } from './engine';
import { cycleMs } from './techniques';

const pattern = (inS: number, holdIn: number, out: number, holdOut: number): CustomPattern => ({
  in: inS,
  holdIn,
  out,
  holdOut,
});

describe('custom pattern limits', () => {
  it('accepts 0 to 12 s holds and 2 to 12 s breaths', () => {
    expect(isValidCustom(pattern(2, 0, 2, 0))).toBe(true);
    expect(isValidCustom(pattern(12, 12, 12, 12))).toBe(true);
    expect(isValidCustom(pattern(4.5, 0, 6.5, 0))).toBe(true);
  });

  it('refuses breathing in or out under 2 s', () => {
    expect(customProblems(pattern(1, 0, 4, 0))).toEqual([
      { field: 'in', message: 'Breathing in can be 2 to 12 seconds.' },
    ]);
    expect(customProblems(pattern(4, 0, 1.5, 0))[0]?.field).toBe('out');
  });

  it('refuses anything over 12 s, negative holds and odd steps', () => {
    expect(customProblems(pattern(13, 0, 4, 0))[0]?.field).toBe('in');
    expect(customProblems(pattern(4, -1, 4, 0))[0]?.message).toBe('A hold can be 0 to 12 seconds.');
    expect(customProblems(pattern(4, 0, 4, 12.5))[0]?.field).toBe('holdOut');
    expect(customProblems(pattern(4.2, 0, 4, 0))[0]?.message).toMatch(/steps of 0.5/);
    expect(isValidCustom(pattern(Number.NaN, 0, 4, 0))).toBe(false);
  });

  it('pulls a typed value into its limits', () => {
    expect(clampCustomValue('in', 0)).toBe(2);
    expect(clampCustomValue('holdIn', 0)).toBe(0);
    expect(clampCustomValue('out', 40)).toBe(12);
    expect(clampCustomValue('holdOut', 3.3)).toBe(3.5);
    expect(clampCustomValue('in', Number.NaN)).toBe(2);
  });
});

describe('custom pattern as a technique', () => {
  it('leaves out holds of 0', () => {
    const t = customToTechnique(pattern(4, 0, 6, 0));
    expect(t.phases.map((p) => p.kind)).toEqual(['in', 'out']);
    expect(cycleMs(t)).toBe(10_000);
  });

  it('keeps both holds when set, and runs in the engine', () => {
    const t = customToTechnique(pattern(4, 2, 6, 1));
    expect(t.phases.map((p) => `${p.kind} ${p.ms}`)).toEqual(['in 4000', 'hold 2000', 'out 6000', 'hold 1000']);
    expect(t.phases[3]?.hint).toBe('Lungs empty');
    expect(breathAt(t, 5000).phase.kind).toBe('hold');
    expect(breathAt(t, 12_500).phase.kind).toBe('hold');
    expect(t.free).toBe(false);
  });

  it('is named by its numbers', () => {
    expect(customName(pattern(4, 2, 6, 0))).toBe('4-2-6-0');
    expect(customToTechnique(pattern(4.5, 0, 6, 0)).name).toBe('4.5-0-6-0');
  });
});

describe('saved patterns', () => {
  it('adds newest first and moves a repeat to the front', () => {
    let saved = addSavedPattern([], pattern(4, 0, 4, 0))!;
    saved = addSavedPattern(saved, pattern(4, 2, 6, 0))!;
    saved = addSavedPattern(saved, pattern(4, 0, 4, 0))!;
    expect(saved.map(customName)).toEqual(['4-0-4-0', '4-2-6-0']);
  });

  it('holds at most 5', () => {
    let saved: CustomPattern[] = [];
    for (let i = 2; i < 2 + MAX_SAVED_PATTERNS; i++) saved = addSavedPattern(saved, pattern(i, 0, 4, 0))!;
    expect(saved).toHaveLength(5);
    expect(addSavedPattern(saved, pattern(10, 0, 4, 0))).toBeNull();
    expect(addSavedPattern(saved, pattern(2, 0, 4, 0))).toHaveLength(5);
  });

  it('removes one', () => {
    const saved = [pattern(4, 0, 4, 0), pattern(5, 0, 5, 0)];
    expect(removeSavedPattern(saved, pattern(4, 0, 4, 0)).map(customName)).toEqual(['5-0-5-0']);
  });

  it('cleans what comes out of storage', () => {
    expect(sanitizeSavedPatterns(undefined)).toEqual([]);
    expect(
      sanitizeSavedPatterns([
        pattern(4, 0, 4, 0),
        { in: 1, holdIn: 0, out: 4, holdOut: 0 },
        'junk',
        null,
        pattern(4, 0, 4, 0),
        { in: '6', holdIn: 0, out: 6, holdOut: 0 },
      ]).map(customName),
    ).toEqual(['4-0-4-0', '6-0-6-0']);
  });
});
