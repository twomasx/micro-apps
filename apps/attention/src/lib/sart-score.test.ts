import { describe, expect, it } from 'vitest';
import { practiceFeedback, scoreSart, scoreTrial, steadiness, type SartTrial } from './sart-score';

const t = (digit: number, ...taps: number[]): SartTrial => ({ digit, size: 0, taps });

describe('scoring one digit', () => {
  it('takes the first tap at 100 ms or later as the response', () => {
    expect(scoreTrial(t(5, 40, 320, 500))).toEqual({ rt: 320, anticipations: 1, kind: 'hit' });
  });

  it('counts a tap only under 100 ms as an anticipation, not a response', () => {
    expect(scoreTrial(t(5, 99))).toEqual({ rt: null, anticipations: 1, kind: 'omission' });
    expect(scoreTrial(t(3, 50))).toEqual({ rt: null, anticipations: 1, kind: 'correctHold' });
  });

  it('treats a tap on a 3 as a commission', () => {
    expect(scoreTrial(t(3, 400)).kind).toBe('commission');
  });
});

describe('SART score', () => {
  it('counts commissions, omissions and anticipations', () => {
    const score = scoreSart([t(3, 300), t(3), t(1, 300), t(2), t(4, 20, 350)]);
    expect(score).toMatchObject({ trials: 5, threes: 2, commissions: 1, omissions: 1, anticipations: 1 });
  });

  it('computes mean, sample SD and CV of correct taps only', () => {
    const score = scoreSart([t(1, 300), t(2, 400), t(4, 500), t(3, 100)]);
    expect(score.meanRt).toBe(400);
    expect(score.sdRt).toBe(100);
    expect(score.cv).toBe(0.25);
  });

  it('gives a perfect, steady run 100', () => {
    const trials = [t(3), ...Array.from({ length: 8 }, (_, i) => t(1 + (i % 2), 300 + (i % 2) * 10))];
    expect(scoreSart(trials).score).toBe(100);
  });

  it('weights holding back on 3s at half the score', () => {
    // Every 3 tapped, every other digit tapped with perfectly even timing.
    const trials = [t(3, 300), t(3, 300), t(1, 300), t(2, 300), t(4, 300)];
    expect(scoreSart(trials).score).toBe(50);
  });

  it('scores steadiness from CV on a straight line from 0.10 to 0.45', () => {
    expect(steadiness(0.05)).toBe(1);
    expect(steadiness(0.1)).toBe(1);
    expect(steadiness(0.275)).toBeCloseTo(0.5);
    expect(steadiness(0.45)).toBe(0);
    expect(steadiness(null)).toBe(0);
  });

  it('copes with no taps at all', () => {
    const score = scoreSart([t(1), t(2), t(3)]);
    expect(score).toMatchObject({ meanRt: null, sdRt: null, cv: null, omissions: 2, commissions: 0 });
    expect(score.score).toBe(50);
  });

  it('copes with an empty run', () => {
    expect(scoreSart([]).score).toBe(75);
  });
});

describe('practice feedback', () => {
  it('says correct, tapped a 3, or missed', () => {
    expect(practiceFeedback(t(5, 300))).toBe('correct');
    expect(practiceFeedback(t(3))).toBe('correct');
    expect(practiceFeedback(t(3, 300))).toBe('tappedThree');
    expect(practiceFeedback(t(5))).toBe('missed');
  });
});
