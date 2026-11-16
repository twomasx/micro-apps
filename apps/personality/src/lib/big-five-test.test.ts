import { describe, expect, it } from 'vitest';
import { aspectBand, bandOf, bigFiveQuestions, scoreBigFive } from './big-five-test.ts';
import { ScoringError, type Answers } from './scoring.ts';

const items = bigFiveQuestions.items;
const all = (value: (item: (typeof items)[number]) => number): Answers =>
  Object.fromEntries(items.map((item) => [item.id, value(item)]));

describe('the b1 question file', () => {
  it('has 100 questions: 20 per trait, 10 per aspect, ids in order', () => {
    expect(items).toHaveLength(100);
    for (const trait of bigFiveQuestions.axes) {
      expect(items.filter((item) => item.axis === trait.id)).toHaveLength(20);
      for (const aspect of trait.aspects) {
        expect(items.filter((item) => item.aspect === aspect.id && item.axis === trait.id)).toHaveLength(10);
      }
    }
    expect(items.map((item) => item.id)).toEqual(items.map((_, n) => `b1-${String(n + 1).padStart(3, '0')}`));
  });

  it('never asks about the same trait twice in a row', () => {
    for (let n = 1; n < items.length; n++) expect(items[n]!.axis).not.toBe(items[n - 1]!.axis);
  });

  it('keeps the published wording next to the shown text', () => {
    for (const item of items) {
      expect(item.text).toBe(`I ${item.sourceText[0]!.toLowerCase()}${item.sourceText.slice(1)}`);
      expect(['+', '-']).toContain(item.keyed);
    }
  });
});

describe('scoreBigFive', () => {
  it('all answers 3: every trait and aspect at 50, middle', () => {
    const result = scoreBigFive(bigFiveQuestions, all(() => 3));
    expect(result.traits.map((trait) => trait.trait)).toEqual(['O', 'C', 'E', 'A', 'N']);
    for (const trait of result.traits) {
      expect(trait.pct).toBe(50);
      expect(trait.band).toBe('middle');
      for (const aspect of trait.aspects) expect(aspect.pct).toBe(50);
    }
    expect(result.flags).toEqual(['same_answers']);
  });

  it('agreeing with every high-keyed question and disagreeing with the rest: 100 everywhere', () => {
    const result = scoreBigFive(bigFiveQuestions, all((item) => (item.keyed === '+' ? 5 : 1)));
    for (const trait of result.traits) {
      expect(trait.pct).toBe(100);
      expect(trait.band).toBe('higher');
      for (const aspect of trait.aspects) expect(aspect.pct).toBe(100);
    }
    expect(result.flags).toEqual([]);
  });

  it('the reverse: 0 everywhere, lower', () => {
    const result = scoreBigFive(bigFiveQuestions, all((item) => (item.keyed === '+' ? 1 : 5)));
    for (const trait of result.traits) {
      expect(trait.pct).toBe(0);
      expect(trait.band).toBe('lower');
    }
  });

  it('all answers 5 scores by keying, and flags the same answer everywhere', () => {
    const result = scoreBigFive(bigFiveQuestions, all(() => 5));
    // Volatility has 6 high-keyed and 4 reverse-keyed questions: (6 * 5 + 4 * 1 - 10) / 40 = 60%.
    const volatility = result.traits.find((trait) => trait.trait === 'N')!.aspects.find((a) => a.aspect === 'volatility')!;
    expect(volatility.pct).toBe(60);
    expect(result.flags).toEqual(['same_answers']);
  });

  it('a missing answer, an unknown question or an answer outside 1 to 5 throws', () => {
    const answers = all(() => 3);
    const missing = Object.fromEntries(Object.entries(answers).filter(([id]) => id !== 'b1-050'));
    expect(() => scoreBigFive(bigFiveQuestions, missing)).toThrow(ScoringError);
    expect(() => scoreBigFive(bigFiveQuestions, { ...answers, 'p1-01': 3 })).toThrow(ScoringError);
    expect(() => scoreBigFive(bigFiveQuestions, { ...answers, 'b1-001': 6 })).toThrow(ScoringError);
    expect(() => scoreBigFive(bigFiveQuestions, { ...answers, 'b1-001': 2.5 })).toThrow(ScoringError);
  });
});

describe('bands', () => {
  it('lower below 40, higher above 60, middle from 40 to 60 inclusive', () => {
    // With 20 questions a trait moves in steps of 1.25.
    expect(bandOf(38.75)).toBe('lower');
    expect(bandOf(40)).toBe('middle');
    expect(bandOf(60)).toBe('middle');
    expect(bandOf(61.25)).toBe('higher');
  });

  it('aspects: lower below 50, higher from 50', () => {
    expect(aspectBand(47.5)).toBe('lower');
    expect(aspectBand(50)).toBe('higher');
  });
});
