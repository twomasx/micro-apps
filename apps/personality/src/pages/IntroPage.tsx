import { useCallback } from 'react';
import { Link } from '../components/Link.tsx';
import { useLoaded } from '../hooks/useLoaded.ts';
import { looksLikeResultId } from '../lib/compare.ts';
import { navigate } from '../lib/navigation.ts';
import { answeredCount, restoreProgress } from '../lib/progress.ts';
import { CURRENT_VERSION, currentQuestions } from '../lib/questions.ts';
import {
  clearCompareWith,
  clearProgress,
  loadCompareWith,
  loadProgress,
  loadResults,
  saveCompareWith,
} from '../lib/store.ts';

/** `withId` is the result in a compare link, `?with=<id>`. */
async function loadSaved(withId: string | null) {
  const progress = restoreProgress(await loadProgress(CURRENT_VERSION), currentQuestions);
  const results = await loadResults();
  const answered = progress ? answeredCount(progress) : 0;

  const linked = looksLikeResultId(withId) ? withId : null;
  const ownLink = linked !== null && results.some((saved) => saved.id === linked);
  if (linked && !ownLink) {
    // Remembered until the test is submitted, which then opens the comparison.
    await saveCompareWith(linked);
  } else if (answered === 0) {
    // No link and no test under way: an old compare link should not come back later.
    await clearCompareWith();
  }

  return {
    answered,
    lastResult: results.at(-1),
    compareWith: ownLink ? null : await loadCompareWith(),
    ownLink,
  };
}

export function IntroPage({ withId }: { withId: string | null }) {
  const load = useCallback(() => loadSaved(withId), [withId]);
  const saved = useLoaded(load);
  const answered = saved?.answered ?? 0;
  const total = currentQuestions.items.length;

  const startOver = async () => {
    await clearProgress(CURRENT_VERSION);
    navigate('test');
  };

  return (
    <main className="intro" data-in-progress={answered > 0}>
      <p className="intro-kicker">Four scales. Sixteen types.</p>
      <h1 className="intro-title">Personality test</h1>
      <p className="intro-lead">
        You get a four-letter type and a percentage on each of the four scales.
      </p>

      <dl className="intro-specs">
        <div className="intro-spec">
          <dt>Questions</dt>
          <dd>{total}</dd>
        </div>
        <div className="intro-spec">
          <dt>Minutes</dt>
          <dd>~6</dd>
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
            Take the test and you will see your result next to theirs. They only see yours if you
            send them the comparison.
          </p>
          {saved.lastResult && (
            <Link to={`c/${saved.compareWith}/${saved.lastResult.id}`} className="intro-compare-link">
              Compare using your last result, {saved.lastResult.type}
            </Link>
          )}
        </section>
      )}
      {saved?.ownLink && (
        <p className="intro-compare-own">
          This is your own compare link. Send it to the person you want to compare with.
        </p>
      )}

      <p className="intro-free">The result is free. You do not need an account.</p>
      <p className="intro-instructions">{currentQuestions.instructions}</p>

      {answered > 0 ? (
        <div className="intro-actions">
          <p className="intro-progress">
            You have answered {answered} of {total} questions.
          </p>
          <Link to="test" className="intro-start">
            Continue the test
          </Link>
          <button type="button" className="intro-restart" onClick={() => void startOver()}>
            Start over
          </button>
        </div>
      ) : (
        <div className="intro-actions">
          <Link to="test" className="intro-start">
            Start the test
          </Link>
        </div>
      )}

      {saved?.lastResult && (
        <p className="intro-last-result">
          <span className="intro-last-result-label">Your last result:</span>{' '}
          <Link to={`r/${saved.lastResult.id}`} className="intro-last-result-link">
            {saved.lastResult.type}
          </Link>
        </p>
      )}
    </main>
  );
}
