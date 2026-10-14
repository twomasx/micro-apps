import { describe, expect, it } from 'vitest';
import { breathsPerMinute, cycleMs, findTechnique, techniques, toTechnique } from './techniques';

describe('techniques data', () => {
  it('has the four techniques in picker order, keys 1 to 4', () => {
    expect(techniques.map((t) => t.id)).toEqual(['sigh', 'box', '478', 'resonant']);
  });

  it('matches the spec timings', () => {
    const seconds = (id: string) => findTechnique(id)!.phases.map((p) => `${p.kind} ${p.ms / 1000}`);
    expect(seconds('sigh')).toEqual(['in 2', 'in 1', 'out 6']);
    expect(seconds('box')).toEqual(['in 4', 'hold 4', 'out 4', 'hold 4']);
    expect(seconds('478')).toEqual(['in 4', 'hold 7', 'out 8']);
    expect(seconds('resonant')).toEqual(['in 5.5', 'out 5.5']);
  });

  it('keeps Resonant locked and the other three free', () => {
    expect(techniques.filter((t) => t.free).map((t) => t.id)).toEqual(['sigh', 'box', '478']);
  });

  it('gives every phase a word and a hint', () => {
    for (const t of techniques) {
      for (const p of t.phases) {
        expect(p.word.length).toBeGreaterThan(0);
        expect(p.hint.length).toBeGreaterThan(0);
      }
    }
  });

  it('has Resonant at about 6 breaths a minute', () => {
    expect(breathsPerMinute(findTechnique('resonant')!)).toBeCloseTo(5.45, 2);
    expect(cycleMs(findTechnique('sigh')!)).toBe(9000);
  });

  it('refuses broken data with a plain message', () => {
    const base = { id: 'x', name: 'X', short: 'X', free: true, wording: '' };
    expect(() => toTechnique({ ...base, phases: [{ kind: 'sniff', seconds: 1 }] })).toThrow(/unknown phase kind/);
    expect(() => toTechnique({ ...base, phases: [{ kind: 'in', seconds: 0 }] })).toThrow(/positive/);
    expect(() => toTechnique({ ...base, phases: [{ kind: 'in', seconds: 2 }] })).toThrow(/one in and one out/);
  });

  it('copy follows the writing rules', () => {
    for (const t of techniques) {
      const text = [t.name, t.wording, ...t.phases.flatMap((p) => [p.word, p.hint])].join(' ');
      expect(text).not.toMatch(/[—!]/);
    }
  });
});
