import { useEffect, useState } from 'react';
import { EnsoCanvas } from '../components/EnsoCanvas';
import { Link } from '../components/Link';
import type { TestRecord } from '../lib/records';
import { PHONE_TIMING_NOTE, PRACTICE_EFFECT_NOTE } from '../lib/test-copy';
import { fetchNorms } from '../lib/api';
import { navigate } from '../lib/navigation';
import { percentileFor, type NormsAnswer } from '../lib/norms';

interface TestResultProps {
  record: TestRecord;
  earlier: readonly TestRecord[];
}

const LENGTH_NAME = { quick: 'Quick', full: 'Full' } as const;

export function TestResult({ record, earlier }: TestResultProps) {
  const s = record.score;
  const goTrials = s.trials - s.threes;
  const first = earlier[0];
  const [norms, setNorms] = useState<NormsAnswer | null>(null);
  useEffect(() => {
    let current = true;
    fetchNorms(record.length).then(
      (answer) => current && setNorms(answer),
      () => undefined,
    );
    return () => {
      current = false;
    };
  }, [record.length]);
  // Shown only once 200 people have taken their first test of this length. Before that, nothing.
  const percentile = percentileFor(norms, s.score, s.version);

  return (
    <main className="screen result">
      <header>
        <p className="section-label">{LENGTH_NAME[record.length]} test result</p>
        <h1 className="title">Attention score</h1>
      </header>

      <section className="score-mark" aria-label={`Attention score ${s.score} out of 100`}>
        <EnsoCanvas className="score-enso" seed={(record.takenAt % 997) + 0.5} progress={1} />
        <p className="score-value" aria-hidden="true">
          {s.score}
          <span className="score-of">of 100</span>
        </p>
      </section>

      {first && (
        <p className="score-compare">
          Your first {record.length} test: {first.score.score}.{' '}
          {earlier.length > 1 && `Since then: ${earlier.slice(1).map((t) => t.score.score).join(', ')}.`}
        </p>
      )}

      {percentile !== null && norms?.ready && (
        <p className="score-compare" data-kind="others">
          Compared with people who took it here: higher than {percentile}% of first {record.length} tests (
          {norms.count.toLocaleString('en-US')} people).
        </p>
      )}

      <dl className="facts result-facts">
        <div className="fact" data-main="true">
          <dt>Taps on a 3</dt>
          <dd>
            {s.commissions} <span className="fact-of">of {s.threes}</span>
          </dd>
          <dd className="fact-note">The main measure. Fewer is better.</dd>
        </div>
        <div className="fact">
          <dt>Missed numbers</dt>
          <dd>
            {s.omissions} <span className="fact-of">of {goTrials}</span>
          </dd>
        </div>
        <div className="fact">
          <dt>Average reaction time</dt>
          <dd>{s.meanRt === null ? 'None' : `${s.meanRt} ms`}</dd>
        </div>
        <div className="fact">
          <dt>How much it varied</dt>
          <dd>{s.sdRt === null ? 'None' : `${s.sdRt} ms`}</dd>
          {s.cv !== null && <dd className="fact-note">CV {s.cv.toFixed(2)}. Lower is steadier.</dd>}
        </div>
        <div className="fact">
          <dt>Early taps</dt>
          <dd>{s.anticipations}</dd>
          <dd className="fact-note">Under 100 ms after a number appeared. Not counted as answers.</dd>
        </div>
      </dl>

      <div className="result-notes">
        {record.nth > 1 && <p>{PRACTICE_EFFECT_NOTE}</p>}
        <p>{PHONE_TIMING_NOTE}</p>
        <p>
          <Link to="science">How the score is calculated</Link>
        </p>
        {record.timing && (
          <details className="timing">
            <summary>Timing on this screen</summary>
            <p>
              Numbers showed for {record.timing.meanDigitMs} ms on average (target 250 ms). One number to the next
              took {record.timing.meanSoaMs} ms on average (target 1150 ms). The furthest any number was from its
              planned time: {record.timing.maxOnsetErrorMs} ms.
            </p>
          </details>
        )}
      </div>

      <footer className="session-actions">
        <button type="button" className="button button-primary" onClick={() => navigate('', { replace: true })}>
          Done
        </button>
      </footer>
    </main>
  );
}
