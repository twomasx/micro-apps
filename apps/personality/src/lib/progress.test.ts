import { describe, expect, it } from 'vitest';
import {
  answeredCount,
  emptyProgress,
  firstUnanswered,
  isComplete,
  restoreProgress,
  withAnswer,
  type Progress,
} from './progress.ts';
import { currentQuestions as questions } from './questions.ts';

function answeredUpTo(count: number): Progress {
  const answers = Object.fromEntries(questions.items.slice(0, count).map((item) => [item.id, 3]));
  return { version: questions.version, answers, index: 0 };
}

describe('progress', () => {
  it('starts empty on the first question', () => {
    const progress = emptyProgress('p1');
    expect(progress.index).toBe(0);
    expect(answeredCount(progress)).toBe(0);
    expect(firstUnanswered(progress, questions)).toBe(0);
  });

  it('withAnswer adds or changes one answer and keeps the rest', () => {
    const first = withAnswer(emptyProgress('p1'), 'p1-01', 2);
    const second = withAnswer(first, 'p1-02', 5);
    const changed = withAnswer(second, 'p1-01', 4);
    expect(changed.answers).toEqual({ 'p1-01': 4, 'p1-02': 5 });
    expect(first.answers).toEqual({ 'p1-01': 2 });
  });

  it('is complete only with all 40 answers', () => {
    expect(isComplete(answeredUpTo(39), questions)).toBe(false);
    expect(isComplete(answeredUpTo(40), questions)).toBe(true);
  });
});

describe('restoreProgress', () => {
  it('returns null for nothing, junk or another version', () => {
    expect(restoreProgress(undefined, questions)).toBeNull();
    expect(restoreProgress('junk', questions)).toBeNull();
    expect(restoreProgress({ version: 'p0', answers: {}, index: 0 }, questions)).toBeNull();
    expect(restoreProgress({ version: 'p1', index: 0 }, questions)).toBeNull();
  });

  it('keeps the saved question', () => {
    const restored = restoreProgress({ ...answeredUpTo(10), index: 4 }, questions);
    expect(restored?.index).toBe(4);
    expect(answeredCount(restored ?? emptyProgress('p1'))).toBe(10);
  });

  it('never resumes past the first unanswered question', () => {
    expect(restoreProgress({ ...answeredUpTo(10), index: 30 }, questions)?.index).toBe(10);
    expect(restoreProgress({ ...answeredUpTo(40), index: 99 }, questions)?.index).toBe(39);
  });

  it('resumes at the first unanswered question when the index is missing or bad', () => {
    const { version, answers } = answeredUpTo(7);
    expect(restoreProgress({ version, answers }, questions)?.index).toBe(7);
    expect(restoreProgress({ version, answers, index: -2 }, questions)?.index).toBe(7);
    expect(restoreProgress({ version, answers, index: 1.5 }, questions)?.index).toBe(7);
  });

  it('drops answers that are invalid or for unknown questions', () => {
    const restored = restoreProgress(
      { version: 'p1', answers: { 'p1-01': 3, 'p1-02': 9, 'p1-03': '4', 'p1-99': 3 }, index: 0 },
      questions,
    );
    expect(restored?.answers).toEqual({ 'p1-01': 3 });
  });
});
