import { vibrate } from '@micro/platform';
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { useBackGuard } from '../hooks/useBackGuard.ts';
import { useTest } from '../hooks/useTest.ts';
import { navigate } from '../lib/navigation.ts';
import { clearCompareWith, loadCompareWith } from '../lib/store.ts';
import { isValidAnswer } from '../lib/progress.ts';
import { currentQuestions } from '../lib/questions.ts';

// How long the chosen answer stays on screen before the next question comes in.
const ADVANCE_DELAY_MS = 160;

function optionId(questionId: string, value: number): string {
  return `${questionId}-${value}`;
}

export function TestPage() {
  const test = useTest(currentQuestions);
  const { status, index, total, question, value } = test;
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');

  const advanceTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(advanceTimer.current), []);

  const goBack = () => {
    window.clearTimeout(advanceTimer.current);
    setDirection('back');
    return test.back();
  };
  // The browser and Android Back button go to the previous question.
  const release = useBackGuard(goBack);

  /** A tap or a number key: save the answer, then move on by itself. Never submits. */
  const pick = (picked: number) => {
    test.answer(picked);
    vibrate(8);
    setDirection('forward');
    window.clearTimeout(advanceTimer.current);
    advanceTimer.current = window.setTimeout(() => test.advanceFrom(index), ADVANCE_DELAY_MS);
  };

  // Move focus to the new question so screen readers and keyboards follow along.
  const legendRef = useRef<HTMLHeadingElement>(null);
  const shownIndex = useRef<number | null>(null);
  useEffect(() => {
    if (status === 'loading') return;
    if (shownIndex.current !== null && shownIndex.current !== index) {
      legendRef.current?.focus({ preventScroll: true });
    }
    shownIndex.current = index;
  }, [status, index]);

  // Keys 1 to 5 answer. Focus moves to the chosen option, so Enter works on the last question.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
      const pressed = Number(event.key);
      if (!question || !isValidAnswer(pressed)) return;
      document.getElementById(optionId(question.id, pressed))?.focus();
      pick(pressed);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    window.clearTimeout(advanceTimer.current);
    setDirection('forward');
    const created = await test.next();
    if (created) {
      await release();
      // Someone who came from a compare link lands on the comparison, not the plain result.
      const compareWith = await loadCompareWith();
      await clearCompareWith();
      navigate(compareWith ? `c/${compareWith}/${created.id}` : `r/${created.id}`, { replace: true });
    }
  };

  if (!question) {
    return (
      <main className="test" data-state={status}>
        <h1 className="test-title">Personality test</h1>
        <p className="test-loading">Loading your test.</p>
      </main>
    );
  }

  return (
    <main className="test" data-state={status} data-index={index} data-answered={test.answered}>
      <header className="test-header">
        <h1 className="test-title">Personality test</h1>
        <p className="test-progress" role="status">
          Question {index + 1} of {total}
        </p>
        {/* Decoration only: the status line above says the same in words. */}
        <ol className="test-axes" aria-hidden="true">
          {test.axes.map((axis) => (
            <li
              key={axis.axis}
              className="test-axis"
              data-axis={axis.axis}
              data-complete={axis.answered === axis.total}
              style={{ '--fill': axis.answered / axis.total } as CSSProperties}
            >
              <span className="test-axis-label">{axis.axis}</span>
              <span className="test-axis-track" />
            </li>
          ))}
        </ol>
      </header>

      <form
        className="question"
        data-question-id={question.id}
        data-direction={direction}
        onSubmit={(event) => void onSubmit(event)}
      >
        {index === 0 && <p className="test-instructions">{currentQuestions.instructions}</p>}

        {/*
          A radiogroup instead of a fieldset: browsers do not let a fieldset stretch
          its content, and the answers need to sit at the bottom of the screen.
          The key restarts the entrance animation for each question.
        */}
        <div
          key={question.id}
          className="question-fieldset"
          role="radiogroup"
          aria-labelledby={`${question.id}-text`}
        >
          <h2
            id={`${question.id}-text`}
            className="question-text"
            ref={legendRef}
            tabIndex={-1}
          >
            {question.text}
          </h2>
          <div className="scale">
            {currentQuestions.scale.map((option) => (
              <label
                key={option.value}
                className="scale-option"
                data-value={option.value}
                data-selected={value === option.value}
                onClick={(event) => {
                  // A tap on the row. Clicks that start on the input itself come from
                  // the keyboard (arrows, Space); those only select, they do not move on.
                  if (!(event.target instanceof HTMLInputElement)) pick(option.value);
                }}
              >
                <input
                  type="radio"
                  id={optionId(question.id, option.value)}
                  name={question.id}
                  value={option.value}
                  checked={value === option.value}
                  onChange={() => test.answer(option.value)}
                  required
                />
                <span className="scale-key" aria-hidden="true">
                  {option.value}
                </span>
                <span className="scale-label">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {test.submitFailed && (
          <p className="test-error" role="alert">
            Your answers could not be sent. They are still saved on this device. Try again.
          </p>
        )}

        <div className="question-actions">
          <button
            type="button"
            className="question-back"
            onClick={goBack}
            disabled={index === 0 || status === 'submitting'}
          >
            Back
          </button>
          <button
            type="submit"
            className="question-next"
            data-last={test.isLast}
            disabled={status === 'submitting'}
          >
            {test.isLast ? 'See your result' : 'Next'}
          </button>
        </div>
      </form>
    </main>
  );
}
