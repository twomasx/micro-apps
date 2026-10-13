import { share, type ShareResult } from '@micro/platform';
import { useCallback, useState, type CSSProperties } from 'react';
import { Link } from '../components/Link.tsx';
import { useLoaded } from '../hooks/useLoaded.ts';
import { useResult } from '../hooks/useResult.ts';
import { revealStep, useReveal } from '../hooks/useReveal.ts';
import { deleteResult, type PublicResult } from '../lib/api.ts';
import { appHref, navigate } from '../lib/navigation.ts';
import { getQuestions } from '../lib/questions.ts';
import { COMPARE_WARNING, describeAxes, SAME_ANSWERS_MESSAGE } from '../lib/result-view.ts';
import { loadResults, removeResult, type SavedResult } from '../lib/store.ts';

function shareMessage(outcome: ShareResult): string | null {
  if (outcome === 'copied') return 'Link copied.';
  if (outcome === 'unavailable') return 'Sharing did not work. Copy the link from the address bar.';
  return null;
}

// The reveal: letters and axes come in one after another, numbers count up from 50.
const STEP_DELAY_MS = 150;
const STEP_DURATION_MS = 900;
const REVEAL_MS = STEP_DELAY_MS * 3 + STEP_DURATION_MS;

function absoluteUrl(path: string): string {
  return `${window.location.origin}${appHref(path)}`;
}

interface ResultViewProps {
  result: PublicResult;
  /** Set when this result was taken on this device. */
  own: SavedResult | undefined;
}

function ResultView({ result, own }: ResultViewProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const questions = getQuestions(result.version);
  const axes = questions ? describeAxes(result.scores, questions) : [];
  const elapsed = useReveal(REVEAL_MS);
  const revealed = elapsed >= REVEAL_MS;

  const shareResult = async () => {
    const outcome = await share({
      title: `My personality type is ${result.type}`,
      url: absoluteUrl(`r/${result.id}`),
    });
    setMessage(shareMessage(outcome));
  };

  const shareCompareLink = async () => {
    const outcome = await share({
      title: 'Take this personality test and compare your result with mine',
      url: absoluteUrl(`?with=${result.id}`),
    });
    setMessage(shareMessage(outcome));
  };

  const deleteOwn = async () => {
    if (!own) return;
    if (!window.confirm('Delete this result? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await deleteResult(result.id, own.deleteToken);
      await removeResult(result.id);
      navigate('', { replace: true });
    } catch {
      setDeleting(false);
      setMessage('The result could not be deleted. Try again.');
    }
  };

  return (
    <main
      className="result"
      data-state="ready"
      data-type={result.type}
      data-own={own !== undefined}
      data-revealed={revealed}
    >
      <h1 className="result-title">
        <span className="result-title-label">{own ? 'Your type is' : 'This type is'}</span>{' '}
        <span className="result-type">
          {Array.from(result.type, (letter, position) => (
            <span
              key={position}
              className="result-letter"
              style={{ '--i': position } as CSSProperties}
            >
              {letter}
            </span>
          ))}
        </span>
      </h1>

      {result.flags.includes('same_answers') && (
        <p className="result-warning">{SAME_ANSWERS_MESSAGE}</p>
      )}

      {result.summary && <p className="result-summary">{result.summary}</p>}

      <ul className="axes">
        {axes.map((axis, position) => {
          const step = revealStep(elapsed, position * STEP_DELAY_MS, STEP_DURATION_MS);
          const winner = axis.left.winner ? axis.left : axis.right;
          // Every number starts at the 50% midpoint and settles on its real value.
          const shown = (side: typeof winner) => Math.round(50 + (side.pct - 50) * step);
          return (
            <li
              key={axis.axis}
              className="axis"
              data-axis={axis.axis}
              data-letter={axis.letter}
              data-balanced={axis.balanced}
              data-winner={axis.left.winner ? 'left' : 'right'}
              style={{ '--pct': shown(winner), '--step': step } as CSSProperties}
            >
              <h2 className="axis-headline">
                <span className="axis-pct">{shown(winner)}%</span>{' '}
                <span className="axis-name">{winner.name}</span>
              </h2>
              {axis.balanceLabel && <p className="axis-balance">{axis.balanceLabel}</p>}
              <p className="axis-plain">{axis.plain}</p>
              <div className="axis-scale" aria-hidden="true">
                <span className="axis-fill" />
                <span className="axis-marker" />
              </div>
              <p className="axis-sides">
                {[axis.left, axis.right].map((side) => (
                  <span
                    key={side.letter}
                    className="axis-side"
                    data-letter={side.letter}
                    data-winner={side.winner}
                    data-pct={side.pct}
                  >
                    <span className="axis-side-name">{side.name}</span>{' '}
                    <span className="axis-side-pct">{shown(side)}%</span>{' '}
                  </span>
                ))}
              </p>
            </li>
          );
        })}
      </ul>

      <section className="result-share">
        <button type="button" className="result-share-button" onClick={() => void shareResult()}>
          Share this result
        </button>
      </section>

      {own ? (
        <section className="result-compare">
          <h2 className="result-compare-title">Compare with someone</h2>
          <p className="result-compare-warning">{COMPARE_WARNING}</p>
          <button
            type="button"
            className="result-compare-button"
            onClick={() => void shareCompareLink()}
          >
            Send a compare link
          </button>
        </section>
      ) : (
        <p className="result-take-test">
          <Link to="" className="result-take-test-link">
            Take the test yourself
          </Link>
        </p>
      )}

      {message && (
        <p className="result-message" role="status">
          {message}
        </p>
      )}

      {own && (
        <section className="result-delete">
          <button
            type="button"
            className="result-delete-button"
            onClick={() => void deleteOwn()}
            disabled={deleting}
          >
            Delete this result
          </button>
        </section>
      )}
    </main>
  );
}

export function ResultPage({ id }: { id: string }) {
  const { state, retry } = useResult(id);
  const loadOwn = useCallback(
    async () => (await loadResults()).find((saved) => saved.id === id) ?? null,
    [id],
  );
  const own = useLoaded(loadOwn);

  if (state.status === 'notFound') {
    return (
      <main className="result" data-state="notFound">
        <h1 className="result-title">Result not found</h1>
        <p>This result does not exist. It may have been deleted.</p>
        <p>
          <Link to="">Go to the personality test</Link>
        </p>
      </main>
    );
  }

  if (state.status === 'error') {
    return (
      <main className="result" data-state="error">
        <h1 className="result-title">The result could not be loaded</h1>
        <p role="alert">Check your connection and try again.</p>
        <button type="button" className="result-retry" onClick={retry}>
          Try again
        </button>
      </main>
    );
  }

  // Wait for the local lookup too, so the page does not flip between "your" and "this".
  if (state.status === 'loading' || own === undefined) {
    return (
      <main className="result" data-state="loading">
        <h1 className="result-title">Your result</h1>
        <p className="result-loading">Loading the result.</p>
      </main>
    );
  }

  return <ResultView result={state.result} own={own ?? undefined} />;
}
