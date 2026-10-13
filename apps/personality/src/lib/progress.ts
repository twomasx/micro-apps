import type { QuestionFile } from './questions.ts';
import { MAX_ANSWER, MIN_ANSWER } from './scoring.ts';

export interface Progress {
  version: string;
  answers: Record<string, number>;
  /** The question on screen, counted from 0. */
  index: number;
}

export function emptyProgress(version: string): Progress {
  return { version, answers: {}, index: 0 };
}

export function isValidAnswer(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= MIN_ANSWER &&
    value <= MAX_ANSWER
  );
}

export function answeredCount(progress: Progress): number {
  return Object.keys(progress.answers).length;
}

/** Index of the first question with no answer, or the question count when all are answered. */
export function firstUnanswered(progress: Progress, questions: QuestionFile): number {
  const index = questions.items.findIndex((item) => !Object.hasOwn(progress.answers, item.id));
  return index === -1 ? questions.items.length : index;
}

export function isComplete(progress: Progress, questions: QuestionFile): boolean {
  return firstUnanswered(progress, questions) === questions.items.length;
}

export function withAnswer(progress: Progress, itemId: string, value: number): Progress {
  return { ...progress, answers: { ...progress.answers, [itemId]: value } };
}

/**
 * Rebuilds saved progress from storage. Anything that does not fit the question
 * file is dropped, so stale or damaged data can never break the test.
 */
export function restoreProgress(raw: unknown, questions: QuestionFile): Progress | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const saved = raw as Partial<Record<keyof Progress, unknown>>;
  if (saved.version !== questions.version) return null;
  if (typeof saved.answers !== 'object' || saved.answers === null) return null;

  const savedAnswers = saved.answers as Record<string, unknown>;
  const answers: Record<string, number> = {};
  for (const item of questions.items) {
    const value = Object.hasOwn(savedAnswers, item.id) ? savedAnswers[item.id] : undefined;
    if (isValidAnswer(value)) answers[item.id] = value;
  }

  const progress: Progress = { version: questions.version, answers, index: 0 };
  // You can be on any question up to the first one you have not answered.
  const furthest = Math.min(firstUnanswered(progress, questions), questions.items.length - 1);
  const index =
    typeof saved.index === 'number' && Number.isInteger(saved.index) && saved.index >= 0
      ? Math.min(saved.index, furthest)
      : furthest;
  return { ...progress, index };
}
