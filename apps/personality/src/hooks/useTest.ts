import { useEffect, useState } from 'react';
import { createResult, type CreatedResult } from '../lib/api.ts';
import {
  answeredCount,
  emptyProgress,
  isComplete,
  isValidAnswer,
  restoreProgress,
  withAnswer,
  type Progress,
} from '../lib/progress.ts';
import type { Question, QuestionFile } from '../lib/questions.ts';
import { addResult, clearProgress, loadProgress, saveProgress } from '../lib/store.ts';

export type TestStatus = 'loading' | 'ready' | 'submitting';

export interface TestState {
  status: TestStatus;
  /** The question on screen, counted from 0. */
  index: number;
  total: number;
  question: Question | undefined;
  /** The saved answer to the question on screen, if any. */
  value: number | undefined;
  answered: number;
  isLast: boolean;
  /** True when the last submit failed. The answers are still saved. */
  submitFailed: boolean;
  answer: (value: number) => void;
  /** Goes to the next question, or submits on the last one. Resolves with the result once submitted. */
  next: () => Promise<CreatedResult | null>;
  /** Goes to the previous question. Returns false on the first question. */
  back: () => boolean;
}

/** The whole test flow: loading saved progress, answering, moving, submitting. */
export function useTest(questions: QuestionFile): TestState {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitFailed, setSubmitFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadProgress(questions.version).then((raw) => {
      if (cancelled) return;
      setProgress(restoreProgress(raw, questions) ?? emptyProgress(questions.version));
    });
    return () => {
      cancelled = true;
    };
  }, [questions]);

  const total = questions.items.length;
  const index = progress?.index ?? 0;
  const question = progress ? questions.items[index] : undefined;
  const value = question ? progress?.answers[question.id] : undefined;
  const isLast = index === total - 1;

  // Saved after every change, so a reload resumes on the same question.
  const update = (next: Progress) => {
    setProgress(next);
    void saveProgress(next);
  };

  const answer = (newValue: number) => {
    if (!progress || !question || submitting || !isValidAnswer(newValue)) return;
    update(withAnswer(progress, question.id, newValue));
  };

  const back = () => {
    if (!progress || submitting || index === 0) return false;
    update({ ...progress, index: index - 1 });
    return true;
  };

  const next = async (): Promise<CreatedResult | null> => {
    if (!progress || submitting || value === undefined) return null;
    if (!isLast) {
      update({ ...progress, index: index + 1 });
      return null;
    }
    if (!isComplete(progress, questions)) return null;

    setSubmitting(true);
    setSubmitFailed(false);
    try {
      const created = await createResult(progress.version, progress.answers);
      await addResult({
        id: created.id,
        version: created.version,
        type: created.type,
        deleteToken: created.deleteToken,
        createdAt: new Date().toISOString(),
      });
      await clearProgress(progress.version);
      return created;
    } catch {
      setSubmitFailed(true);
      setSubmitting(false);
      return null;
    }
  };

  return {
    status: !progress ? 'loading' : submitting ? 'submitting' : 'ready',
    index,
    total,
    question,
    value,
    answered: progress ? answeredCount(progress) : 0,
    isLast,
    submitFailed,
    answer,
    next,
    back,
  };
}
