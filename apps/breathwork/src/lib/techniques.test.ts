import { describe, expect, it } from 'vitest';
import { breathsPerMinute, cycleMs, EVIDENCE_LABELS, findTechnique, techniques, toTechnique } from './techniques';

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

  it('copy follows the writing rules and the honest-claims rules', () => {
    for (const t of techniques) {
      const text = [
        t.name,
        t.wording,
        t.evidence?.note ?? '',
        ...t.phases.flatMap((p) => [p.word, p.hint]),
        ...(t.evidence?.sources ?? []).map((s) => s.finding),
      ].join(' ');
      expect(text).not.toMatch(/[—!]/);
      expect(text).not.toMatch(/rewires|syncs your brainwaves|treats|cures|clinically proven|scientifically accurate|hacks/i);
    }
  });

  it('gives every technique an evidence label and 1 to 3 sources with links', () => {
    expect(Object.fromEntries(techniques.map((t) => [t.id, t.evidence?.label]))).toEqual({
      sigh: 'Little research',
      box: 'Little research',
      '478': 'Little research',
      resonant: 'Some research',
    });
    for (const t of techniques) {
      expect(EVIDENCE_LABELS).toContain(t.evidence!.label);
      expect(t.evidence!.sources.length).toBeGreaterThanOrEqual(1);
      expect(t.evidence!.sources.length).toBeLessThanOrEqual(3);
      expect(t.evidence!.note.length).toBeGreaterThan(0);
      for (const s of t.evidence!.sources) {
        expect(s.url).toMatch(/^https:\/\/doi\.org\/10\./);
        expect(s.year).toBeGreaterThan(2000);
        expect(s.finding.length).toBeGreaterThan(40);
      }
    }
  });

  it('refuses an unknown evidence label or too many sources', () => {
    const phases = [
      { kind: 'in', seconds: 2 },
      { kind: 'out', seconds: 2 },
    ];
    const base = { id: 'x', name: 'X', short: 'X', free: true, wording: '', phases };
    const source = { authors: 'A', year: 2020, title: 'T', journal: 'J', url: 'https://doi.org/10.1/x', finding: 'f' };
    expect(() => toTechnique({ ...base, evidence: 'Strong' })).toThrow(/unknown evidence label/);
    expect(() => toTechnique({ ...base, evidence: 'Some research', sources: [source, source, source, source] })).toThrow(
      /1 to 3/,
    );
    expect(toTechnique(base).evidence).toBeNull();
  });
});
