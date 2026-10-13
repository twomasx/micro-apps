import { describe, expect, it } from 'vitest';
import p1 from '../data/items.p1.json';
import { score, ScoringError, winningPct, type AxisScore, type ScoreResult } from './scoring.ts';

const RIGHT_POLES = new Set(p1.axes.map((axis) => axis.right.letter));

function answersFrom(pick: (item: (typeof p1.items)[number]) => number): Record<string, number> {
  return Object.fromEntries(p1.items.map((item) => [item.id, pick(item)]));
}

/** All 3s, then the first `count` questions of one pole on one axis set to `value`. */
function nudged(axisId: string, pole: string, count: number, value: number): Record<string, number> {
  const answers = answersFrom(() => 3);
  const items = p1.items.filter((item) => item.axis === axisId && item.pole === pole);
  for (const item of items.slice(0, count)) {
    answers[item.id] = value;
  }
  return answers;
}

function axisOf(result: ScoreResult, axisId: string): AxisScore {
  const found = result.scores.find((axisScore) => axisScore.axis === axisId);
  if (!found) throw new Error(`No score for ${axisId}`);
  return found;
}

describe('question file p1', () => {
  it('has 40 questions, 10 per axis, 5 toward each pole', () => {
    expect(p1.items).toHaveLength(40);
    for (const axis of p1.axes) {
      const items = p1.items.filter((item) => item.axis === axis.id);
      expect(items).toHaveLength(10);
      expect(items.filter((item) => item.pole === axis.left.letter)).toHaveLength(5);
      expect(items.filter((item) => item.pole === axis.right.letter)).toHaveLength(5);
    }
  });

  it('lists the axes in type code order', () => {
    expect(p1.axes.map((axis) => axis.id)).toEqual(['EI', 'SN', 'TF', 'JP']);
  });
});

describe('score', () => {
  it('all answers 3: every axis 50%, tie-break gives ESTJ, all axes balanced', () => {
    const result = score(p1, answersFrom(() => 3));
    expect(result.type).toBe('ESTJ');
    expect(result.version).toBe('p1');
    for (const axisScore of result.scores) {
      expect(axisScore.leftPct).toBe(50);
      expect(axisScore.rightPct).toBe(50);
      expect(axisScore.balanced).toBe(true);
    }
  });

  it('all answers 5: every axis 50%, ESTJ, same_answers flag set', () => {
    const result = score(p1, answersFrom(() => 5));
    expect(result.type).toBe('ESTJ');
    expect(result.flags).toEqual(['same_answers']);
    for (const axisScore of result.scores) {
      expect(axisScore.rightPct).toBe(50);
    }
  });

  it('right-pole questions 5 and left-pole questions 1: 100% I, N, F, P', () => {
    const result = score(
      p1,
      answersFrom((item) => (RIGHT_POLES.has(item.pole) ? 5 : 1)),
    );
    expect(result.type).toBe('INFP');
    expect(result.flags).toEqual([]);
    for (const axisScore of result.scores) {
      expect(axisScore.rightPct).toBe(100);
      expect(axisScore.leftPct).toBe(0);
      expect(axisScore.balanced).toBe(false);
    }
  });

  it('left-pole questions 5 and right-pole questions 1: 100% E, S, T, J', () => {
    const result = score(
      p1,
      answersFrom((item) => (RIGHT_POLES.has(item.pole) ? 1 : 5)),
    );
    expect(result.type).toBe('ESTJ');
    for (const axisScore of result.scores) {
      expect(axisScore.leftPct).toBe(100);
      expect(axisScore.rightPct).toBe(0);
      expect(axisScore.balanced).toBe(false);
    }
  });

  it('an axis total of 32 (55%) is balanced', () => {
    // Two I questions at 4: total 30 + 2 = 32.
    const axisScore = axisOf(score(p1, nudged('EI', 'I', 2, 4)), 'EI');
    expect(axisScore.rightPct).toBe(55);
    expect(axisScore.leftPct).toBe(45);
    expect(axisScore.letter).toBe('I');
    expect(axisScore.balanced).toBe(true);
    expect(winningPct(axisScore)).toBe(55);
  });

  it('an axis total of 33 (57.5%) is not balanced', () => {
    // Three I questions at 4: total 30 + 3 = 33.
    const axisScore = axisOf(score(p1, nudged('EI', 'I', 3, 4)), 'EI');
    expect(axisScore.rightPct).toBe(57.5);
    expect(axisScore.letter).toBe('I');
    expect(axisScore.balanced).toBe(false);
  });

  it('balanced works the same on the left side', () => {
    const at55 = axisOf(score(p1, nudged('EI', 'E', 2, 4)), 'EI');
    expect(at55.leftPct).toBe(55);
    expect(at55.letter).toBe('E');
    expect(at55.balanced).toBe(true);

    const at57 = axisOf(score(p1, nudged('EI', 'E', 3, 4)), 'EI');
    expect(at57.leftPct).toBe(57.5);
    expect(at57.balanced).toBe(false);
  });

  it('percentages move in steps of 2.5', () => {
    const base = axisOf(score(p1, answersFrom(() => 3)), 'SN');
    const oneStep = axisOf(score(p1, nudged('SN', 'N', 1, 4)), 'SN');
    expect(oneStep.rightPct - base.rightPct).toBe(2.5);
  });

  it('tie at 50%: the pole with more answers of 4 or 5 on its own questions wins', () => {
    // I questions: 5, 5, 1, 1, 3 (two agrees). E questions: 4, 2, 3, 3, 3 (one agree). Total 30.
    const answers = answersFrom(() => 3);
    const iItems = p1.items.filter((item) => item.pole === 'I');
    const eItems = p1.items.filter((item) => item.pole === 'E');
    [5, 5, 1, 1].forEach((value, index) => {
      const item = iItems[index];
      if (item) answers[item.id] = value;
    });
    [4, 2].forEach((value, index) => {
      const item = eItems[index];
      if (item) answers[item.id] = value;
    });
    const axisScore = axisOf(score(p1, answers), 'EI');
    expect(axisScore.rightPct).toBe(50);
    expect(axisScore.letter).toBe('I');
    expect(axisScore.balanced).toBe(true);
  });

  it('does not set same_answers when answers differ', () => {
    expect(score(p1, nudged('EI', 'I', 1, 4)).flags).toEqual([]);
  });

  it('missing an answer throws', () => {
    const answers = answersFrom(() => 3);
    delete answers['p1-17'];
    expect(() => score(p1, answers)).toThrow(ScoringError);
    expect(() => score(p1, {})).toThrow(ScoringError);
  });

  it('an answer outside 1 to 5 throws', () => {
    for (const bad of [0, 6, -1, 2.5, Number.NaN]) {
      const answers = answersFrom(() => 3);
      answers['p1-01'] = bad;
      expect(() => score(p1, answers)).toThrow(ScoringError);
    }
  });

  it('an answer that is not a number throws', () => {
    const answers = { ...answersFrom(() => 3), 'p1-01': '3' } as unknown as Record<string, number>;
    expect(() => score(p1, answers)).toThrow(ScoringError);
  });

  it('an answer for an unknown question throws', () => {
    expect(() => score(p1, { ...answersFrom(() => 3), 'p1-99': 3 })).toThrow(ScoringError);
  });
});

describe('winningPct', () => {
  it('shows the winning side as a whole number', () => {
    const result = score(
      p1,
      answersFrom((item) => (RIGHT_POLES.has(item.pole) ? 5 : 1)),
    );
    expect(winningPct(axisOf(result, 'EI'))).toBe(100);
    // 57.5 rounds up to 58.
    expect(winningPct(axisOf(score(p1, nudged('EI', 'I', 3, 4)), 'EI'))).toBe(58);
  });
});
