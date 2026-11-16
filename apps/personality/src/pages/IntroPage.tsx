import { useCallback, useEffect, useState } from 'react';
import { Link } from '../components/Link.tsx';
import { useLoaded } from '../hooks/useLoaded.ts';
import { earlyIntroState, forgetEarlyIntroState, loadIntroState } from '../lib/intro-state.ts';
import { navigate } from '../lib/navigation.ts';
import { clearProgress } from '../lib/store.ts';
import { TESTS, type TestKind } from '../lib/tests.ts';

interface IntroCopy {
  kicker: string;
  title: string;
  lead: string;
  minutes: string;
  /** The other test, offered under this one. */
  other: { kind: TestKind; title: string; text: string };
}

const COPY: Readonly<Record<TestKind, IntroCopy>> = {
  type: {
    kicker: 'Four scales. Sixteen types.',
    title: 'Personality test',
    lead: 'You get a four-letter type and a percentage on each of the four scales.',
    minutes: '~6',
    other: {
      kind: 'big-five',
      title: 'Big Five test',
      text: '100 questions, about 12 minutes. A score on each of the five traits most personality research uses.',
    },
  },
  'big-five': {
    kicker: 'Five traits. Ten aspects.',
    title: 'Big Five personality test',
    lead: 'You get a score from 0 to 100 on each of the five traits most personality research uses.',
    minutes: '~12',
    other: {
      kind: 'type',
      title: 'Four-letter personality test',
      text: '40 questions, about 6 minutes. A four-letter type with a percentage on each scale.',
    },
  },
};

export function IntroPage({ kind, withId }: { kind: TestKind; withId: string | null }) {
  const { questions, path } = TESTS[kind];
  const copy = COPY[kind];
  const load = useCallback(() => loadIntroState(withId, kind), [withId, kind]);
  // Read before the first render when the app opened here, so a returning visitor's screen draws once.
  const [early] = useState(() => earlyIntroState(withId, kind));
  useEffect(() => forgetEarlyIntroState(), []);
  const saved = useLoaded(load, early);
  const answered = saved?.answered ?? 0;
  const total = questions.items.length;
  const testPath = `${path}test`;
  const lastLabel = kind === 'type' ? saved?.lastResult?.type : 'See it';

  const startOver = async () => {
    await clearProgress(questions.version);
    navigate(testPath);
  };

  return (
    <main className="intro" data-kind={kind} data-in-progress={answered > 0}>
      <p className="intro-kicker">{copy.kicker}</p>
      <h1 className="intro-title">{copy.title}</h1>
      <p className="intro-lead">{copy.lead}</p>

      <dl className="intro-specs">
        <div className="intro-spec">
          <dt>Questions</dt>
          <dd>{total}</dd>
        </div>
        <div className="intro-spec">
          <dt>Minutes</dt>
          <dd>{copy.minutes}</dd>
        </div>
        <div className="intro-spec">
          <dt>For the result</dt>
          <dd>$0</dd>
        </div>
      </dl>

      {saved?.compareWith && (
        <section className="intro-compare">
          <h2 className="intro-compare-title">Someone wants to compare</h2>
          <p className="intro-compare-text">
            Take the test and you will see your result next to theirs. They only see yours if you send them the comparison.
          </p>
          {saved.lastResult && (
            <Link to={`c/${saved.compareWith}/${saved.lastResult.id}`} className="intro-compare-link">
              {kind === 'type' ? `Compare using your last result, ${saved.lastResult.type}` : 'Compare using your last result'}
            </Link>
          )}
        </section>
      )}
      {saved?.ownLink && (
        <p className="intro-compare-own">This is your own compare link. Send it to the person you want to compare with.</p>
      )}

      <p className="intro-free">The result is free. You do not need an account.</p>
      <p className="intro-instructions">{questions.instructions}</p>

      {answered > 0 ? (
        <div className="intro-actions">
          <p className="intro-progress">
            You have answered {answered} of {total} questions.
          </p>
          <Link to={testPath} className="intro-start">
            Continue the test
          </Link>
          <button type="button" className="intro-restart" onClick={() => void startOver()}>
            Start over
          </button>
        </div>
      ) : (
        <div className="intro-actions">
          <Link to={testPath} className="intro-start">
            Start the test
          </Link>
        </div>
      )}

      {saved?.lastResult && (
        <p className="intro-last-result">
          <span className="intro-last-result-label">Your last result:</span>{' '}
          <Link to={`r/${saved.lastResult.id}`} className="intro-last-result-link">
            {lastLabel}
          </Link>
        </p>
      )}

      <section className="intro-other" data-kind={copy.other.kind}>
        <h2 className="intro-other-title">Also here: {copy.other.title}</h2>
        <p className="intro-other-text">{copy.other.text}</p>
        <Link to={TESTS[copy.other.kind].path} className="intro-other-link">
          Go to the {copy.other.title.toLowerCase()}
        </Link>
      </section>
    </main>
  );
}
