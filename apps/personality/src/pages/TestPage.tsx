import { useEffect, useRef, type FormEvent } from 'react';
import { useBackGuard } from '../hooks/useBackGuard.ts';
import { useTest } from '../hooks/useTest.ts';
import { navigate } from '../lib/navigation.ts';
import { isValidAnswer } from '../lib/progress.ts';
import { currentQuestions } from '../lib/questions.ts';

function optionId(questionId: string, value: number): string {
  return `${questionId}-${value}`;
}

export function TestPage() {
  const test = useTest(currentQuestions);
  // The browser and Android Back button go to the previous question.
  const release = useBackGuard(test.back);
  const { status, index, total, question, value, answer } = test;

  // Move focus to the new question so screen readers and keyboards follow along.
  const legendRef = useRef<HTMLLegendElement>(null);
  const shownIndex = useRef<number | null>(null);
  useEffect(() => {
    if (status === 'loading') return;
    if (shownIndex.current !== null && shownIndex.current !== index) {
      legendRef.current?.focus();
    }
    shownIndex.current = index;
  }, [status, index]);

  // Keys 1 to 5 answer. Focus moves to the chosen option, so Enter goes on.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
      const pressed = Number(event.key);
      if (!question || !isValidAnswer(pressed)) return;
      answer(pressed);
      document.getElementById(optionId(question.id, pressed))?.focus();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const created = await test.next();
    if (created) {
      await release();
      navigate(`r/${created.id}`, { replace: true });
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
      <h1 className="test-title">Personality test</h1>
      <p className="test-progress" role="status">
        Question {index + 1} of {total}
      </p>
      {index === 0 && <p className="test-instructions">{currentQuestions.instructions}</p>}

      <form
        className="question"
        data-question-id={question.id}
        onSubmit={(event) => void onSubmit(event)}
      >
        <fieldset className="question-fieldset">
          <legend className="question-text" ref={legendRef} tabIndex={-1}>
            {question.text}
          </legend>
          {currentQuestions.scale.map((option) => (
            <label
              key={option.value}
              className="scale-option"
              data-value={option.value}
              data-selected={value === option.value}
            >
              <input
                type="radio"
                id={optionId(question.id, option.value)}
                name={question.id}
                value={option.value}
                checked={value === option.value}
                onChange={() => answer(option.value)}
                required
              />
              <span className="scale-label">{option.label}</span>
            </label>
          ))}
        </fieldset>

        {test.submitFailed && (
          <p className="test-error" role="alert">
            Your answers could not be sent. They are still saved on this device. Try again.
          </p>
        )}

        <div className="question-actions">
          {index > 0 && (
            <button
              type="button"
              className="question-back"
              onClick={test.back}
              disabled={status === 'submitting'}
            >
              Back
            </button>
          )}
          <button type="submit" className="question-next" disabled={status === 'submitting'}>
            {test.isLast ? 'See your result' : 'Next'}
          </button>
        </div>
      </form>
    </main>
  );
}
