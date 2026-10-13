import { useEffect, useRef, useState } from 'react';
import { createResult, type CreatedResult } from '../lib/api.ts';
import {
  answeredCount,
  axisProgress,
  emptyProgress,
  isComplete,
  isValidAnswer,
  restoreProgress,
  withAnswer,
  type AxisProgress,
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
  /** Answered count per axis, in type code order. */
  axes: AxisProgress[];
  isLast: boolean;
  /** True when the last submit failed. The answers are still saved. */
  submitFailed: boolean;
  answer: (value: number) => void;
  /**
   * Moves on from question `fromIndex` if it is still on screen and answered.
   * Never submits. Used to move on by itself a moment after an answer is picked.
   */
  advanceFrom: (fromIndex: number) => void;
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
  // The actions read these, so one called from a timer or a Back press sees the latest state.
  const latest = useRef<Progress | null>(null);
  const busy = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void loadProgress(questions.version).then((raw) => {
      if (cancelled) return;
      const restored = restoreProgress(raw, questions) ?? emptyProgress(questions.version);
      latest.current = restored;
      setProgress(restored);
    });
    return () => {
      cancelled = true;
    };
  }, [questions]);

  const total = questions.items.length;
  const lastIndex = total - 1;

  // Saved after every change, so a reload resumes on the same question.
  const update = (next: Progress) => {
    latest.current = next;
    setProgress(next);
    void saveProgress(next);
  };

  const currentAnswer = (current: Progress): number | undefined => {
    const item = questions.items[current.index];
    return item ? current.answers[item.id] : undefined;
  };

  const answer = (newValue: number) => {
    const current = latest.current;
    const item = current ? questions.items[current.index] : undefined;
    if (!current || !item || busy.current || !isValidAnswer(newValue)) return;
    update(withAnswer(current, item.id, newValue));
  };

  const advanceFrom = (fromIndex: number) => {
    const current = latest.current;
    if (!current || busy.current || current.index !== fromIndex) return;
    if (fromIndex >= lastIndex || currentAnswer(current) === undefined) return;
    update({ ...current, index: fromIndex + 1 });
  };

  const back = () => {
    const current = latest.current;
    if (!current || busy.current || current.index === 0) return false;
    update({ ...current, index: current.index - 1 });
    return true;
  };

  const next = async (): Promise<CreatedResult | null> => {
    const current = latest.current;
    if (!current || busy.current || currentAnswer(current) === undefined) return null;
    if (current.index < lastIndex) {
      update({ ...current, index: current.index + 1 });
      return null;
    }
    if (!isComplete(current, questions)) return null;

    busy.current = true;
    setSubmitting(true);
    setSubmitFailed(false);
    try {
      const created = await createResult(current.version, current.answers);
      await addResult({
        id: created.id,
        version: created.version,
        type: created.type,
        deleteToken: created.deleteToken,
        createdAt: new Date().toISOString(),
      });
      await clearProgress(current.version);
      return created;
    } catch {
      busy.current = false;
      setSubmitFailed(true);
      setSubmitting(false);
      return null;
    }
  };

  const index = progress?.index ?? 0;
  const question = progress ? questions.items[index] : undefined;

  return {
    status: !progress ? 'loading' : submitting ? 'submitting' : 'ready',
    index,
    total,
    question,
    value: progress ? currentAnswer(progress) : undefined,
    answered: progress ? answeredCount(progress) : 0,
    axes: progress ? axisProgress(progress, questions) : [],
    isLast: index === lastIndex,
    submitFailed,
    answer,
    advanceFrom,
    next,
    back,
  };
}
