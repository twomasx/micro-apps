import { useState } from 'react';
import { SartStage } from '../components/SartStage';
import { useAppData } from '../hooks/useAppData';
import { useWakeLock } from '../hooks/useWakeLock';
import { saveTest, updateSettings } from '../lib/app-data';
import { randomId } from '../lib/ids';
import { navigate } from '../lib/navigation';
import { dayStatus, localDate } from '../lib/program';
import type { TestRecord } from '../lib/records';
import type { TimingReport } from '../lib/sart-runner';
import { practiceFeedback, type SartLength, type SartTrial } from '../lib/sart-score';
import { buildSequence, REPEATS, sequenceSeconds, type SartItem } from '../lib/sart-sequence';
import { buildTestRecord, earlierResults } from '../lib/tests';
import { TestResult } from './TestResult';

type Step =
  | { name: 'choose' }
  | { name: 'practice'; items: SartItem[]; run: number }
  | { name: 'practiceDone'; correct: number; total: number }
  | { name: 'test'; items: SartItem[]; run: number }
  | { name: 'result'; record: TestRecord }
  | { name: 'stopped'; reason: 'hidden' | 'stopped' };

const LENGTHS: { id: SartLength; name: string; detail: string }[] = [
  {
    id: 'quick',
    name: 'Quick',
    detail: `${REPEATS.quick * 9} numbers, about ${Math.round(sequenceSeconds('quick') / 60)} minutes.`,
  },
  {
    id: 'full',
    name: 'Full',
    detail: `${REPEATS.full * 9} numbers, about ${(sequenceSeconds('full') / 60).toFixed(1)} minutes. The standard research length.`,
  },
];

export function TestPage() {
  const data = useAppData();
  const [step, setStep] = useState<Step>({ name: 'choose' });
  const [length, setLength] = useState<SartLength>('quick');
  const { lock } = useWakeLock();

  if (!data.loaded) return <main className="screen" aria-busy="true" />;

  const startPractice = () => {
    void lock.acquire();
    setStep({ name: 'practice', items: buildSequence('practice'), run: Date.now() });
  };
  const startTest = () => {
    void lock.acquire();
    setStep({ name: 'test', items: buildSequence(length), run: Date.now() });
  };
  const stopped = (reason: 'hidden' | 'stopped') => {
    void lock.release();
    setStep({ name: 'stopped', reason });
  };

  const finishPractice = (trials: SartTrial[]) => {
    void lock.release();
    updateSettings({ practiceDone: true });
    const correct = trials.filter((t) => practiceFeedback(t) === 'correct').length;
    setStep({ name: 'practiceDone', correct, total: trials.length });
  };
  const finishTest = (trials: SartTrial[], timing: TimingReport) => {
    void lock.release();
    const now = Date.now();
    const record = buildTestRecord({
      id: randomId(),
      takenAt: now,
      date: localDate(now),
      length,
      trials,
      timing,
      tests: data.tests,
      completedDays: dayStatus(data.sessions, localDate(now)).completedDays,
    });
    saveTest(record);
    setStep({ name: 'result', record });
  };

  switch (step.name) {
    case 'practice':
      return (
        <SartStage
          key={step.run}
          items={step.items}
          practice
          onFinish={finishPractice}
          onAbort={() => stopped('hidden')}
          onStop={() => stopped('stopped')}
        />
      );
    case 'test':
      return (
        <SartStage
          key={step.run}
          items={step.items}
          practice={false}
          onFinish={finishTest}
          onAbort={() => stopped('hidden')}
          onStop={() => stopped('stopped')}
        />
      );
    case 'result':
      return <TestResult record={step.record} earlier={earlierResults(data.tests, step.record)} />;
    case 'practiceDone':
      return (
        <main className="screen test-intro">
          <h1 className="title">Practice done</h1>
          <p className="lead">
            {step.correct} of {step.total} correct.
          </p>
          <p>The test itself gives no feedback. Keep going at the same pace until the end.</p>
          <footer className="session-actions">
            <button type="button" className="button button-primary" onClick={startTest}>
              Start the test
            </button>
          </footer>
        </main>
      );
    case 'stopped':
      return (
        <main className="screen test-intro">
          <h1 className="title">Test stopped</h1>
          <p className="lead">
            {step.reason === 'hidden'
              ? 'You left the app, so this run was not counted.'
              : 'You stopped the test, so this run was not counted.'}
          </p>
          <footer className="session-actions test-actions">
            <button type="button" className="button button-primary" onClick={() => setStep({ name: 'choose' })}>
              Start again
            </button>
            <button type="button" className="button button-quiet" onClick={() => navigate('')}>
              Back to today
            </button>
          </footer>
        </main>
      );
    case 'choose':
      return (
        <main className="screen test-intro">
          <header>
            <h1 className="title">Attention test</h1>
            <p className="lead">A standard test of sustained attention, the SART. Always free.</p>
          </header>

          <ol className="intro-steps">
            <li>Numbers from 1 to 9 appear one at a time.</li>
            <li>Tap anywhere on the screen for every number except 3.</li>
            <li>Don't tap for 3.</li>
            <li>Speed and accuracy matter equally.</li>
          </ol>

          <fieldset className="lengths">
            <legend className="section-label">Length</legend>
            {LENGTHS.map((option) => (
              <label key={option.id} className="length-option" data-selected={length === option.id}>
                <input
                  type="radio"
                  name="length"
                  value={option.id}
                  checked={length === option.id}
                  onChange={() => setLength(option.id)}
                />
                <span className="length-name">{option.name}</span>
                <span className="length-detail">{option.detail}</span>
              </label>
            ))}
          </fieldset>

          <p className="test-note">Find a quiet moment. Leaving the app stops the test. With a keyboard, the space bar works too.</p>

          <footer className="session-actions">
            {data.settings.practiceDone ? (
              <button type="button" className="button button-primary" onClick={startTest}>
                Start the test
              </button>
            ) : (
              <button type="button" className="button button-primary" onClick={startPractice}>
                Start with a practice round
              </button>
            )}
          </footer>
        </main>
      );
  }
}
