import { describe, expect, it } from 'vitest';
import data from '../data/presets.json';
import { EVIDENCE_LABELS, presets, proposedPresets } from './presets';

describe('evidence in presets.json', () => {
  it('gives every preset one of the three labels', () => {
    for (const preset of proposedPresets) {
      expect(EVIDENCE_LABELS, preset.id).toContain(preset.evidence);
    }
  });

  it('gives every preset 1 to 3 sources with a title, a year, a finding and a DOI link', () => {
    for (const preset of proposedPresets) {
      expect(preset.sources.length, preset.id).toBeGreaterThanOrEqual(1);
      expect(preset.sources.length, preset.id).toBeLessThanOrEqual(3);
      for (const source of preset.sources) {
        expect(source.url).toMatch(/^https:\/\/doi\.org\/10\.\d{4,}\/\S+$/);
        expect(source.title.length).toBeGreaterThan(10);
        expect(source.authors.length).toBeGreaterThan(3);
        expect(source.finding.length).toBeGreaterThan(20);
        expect(source.year).toBeGreaterThanOrEqual(1990);
      }
    }
  });

  it('keeps the wording honest: no banned claims, no em dashes, no exclamation marks', () => {
    const text = JSON.stringify(proposedPresets.map((p) => [p.wording, p.evidenceNote, p.sources.map((s) => s.finding)]));
    for (const banned of [/rewire/i, /sync(s|ed)? your brain/i, /clinically proven/i, /scientifically accurate/i, /\bcures?\b/i, /\btreats?\b/i, /boosts? IQ/i, /—/, /!/]) {
      expect(text).not.toMatch(banned);
    }
  });

  it('shows no evidence in the app until it is approved', () => {
    for (const preset of presets) {
      if (data.evidenceApproved) {
        expect(preset.evidence).not.toBeNull();
      } else {
        expect(preset.evidence).toBeNull();
        expect(preset.sources).toEqual([]);
      }
    }
  });
});
