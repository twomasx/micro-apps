import { share } from '@micro/platform';
import { useEffect, useState } from 'react';
import { Link } from '../components/Link.tsx';
import { PairScale } from '../components/compare/PairScale.tsx';
import { Prose } from '../components/Prose.tsx';
import { useCompare } from '../hooks/useCompare.ts';
import { useLoaded } from '../hooks/useLoaded.ts';
import { CLOSED_LABEL, isClosedResponse } from '@micro/payments/client';
import { CONTACT_EMAIL } from '@micro/payments/contact';
import { PassOffer } from '../components/PassOffer.tsx';
import { usePaymentsStatus } from '../hooks/usePaymentsStatus.ts';
import { ApiError, startCheckout } from '../lib/api.ts';
import { swapSides, type CompareResponse } from '../lib/compare.ts';
import { appHref, leaveTo, onPageRestored } from '../lib/navigation.ts';
import { getProduct, priceLine, type ProductId } from '../lib/products.ts';
import { shareMessage } from '../lib/share-message.ts';
import { loadResults } from '../lib/store.ts';

export const SIMILARITY_LABEL = 'How similar your answers are';
export const SIMILARITY_NOTE =
  'This is 100 minus the average gap between the two scores on the four scales. It is not a prediction. Research finds that having similar personalities predicts relationship satisfaction only weakly.';

async function loadOwnIds(): Promise<string[]> {
  return (await loadResults()).map((saved) => saved.id);
}

interface CompareViewProps {
  /** The comparison, with your own result first when one of the two is yours. */
  compare: CompareResponse;
  /** True when the first result was taken on this device. */
  own: boolean;
  unconfirmed: boolean;
  onCheckAgain: () => void;
}

function CompareView({ compare, own, unconfirmed, onCheckAgain }: CompareViewProps) {
  const [starting, setStarting] = useState(false);
  const [failed, setFailed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [closedByServer, setClosedByServer] = useState(false);
  const status = usePaymentsStatus();
  // Back from Stripe's page can show this page as it was left, with the buttons still waiting.
  useEffect(() => onPageRestored(() => setStarting(false)), []);
  const closed = status?.enabled === false || closedByServer;
  const { a, b } = compare;
  const names = own ? { a: 'You', b: 'Them' } : { a: 'First', b: 'Second' };

  const unlock = async (product: ProductId) => {
    setStarting(true);
    setFailed(false);
    try {
      leaveTo(await startCheckout(product, a.id, b.id));
    } catch (error) {
      setStarting(false);
      if (error instanceof ApiError && isClosedResponse(error.status)) setClosedByServer(true);
      else setFailed(true);
    }
  };

  const shareComparison = async () => {
    const outcome = await share({
      title: `${a.type} and ${b.type}: two personality results compared`,
      url: `${window.location.origin}${appHref(`c/${a.id}/${b.id}`)}`,
    });
    setMessage(shareMessage(outcome));
  };

  return (
    <main className="compare" data-state="ready" data-own={own} data-unlocked={compare.unlocked}>
      <h1 className="compare-title">
        <span className="compare-kicker">Comparison</span>{' '}
        <span className="compare-types">
          <span className="compare-type">{a.type}</span>{' '}
          <span className="compare-and">and</span>{' '}
          <span className="compare-type">{b.type}</span>
        </span>
      </h1>

      <ul className="compare-legend">
        {(['a', 'b'] as const).map((side) => (
          <li key={side} className="compare-legend-item" data-side={side}>
            <span className="pair-marker" data-side={side} aria-hidden="true" />
            <span className="compare-legend-name">{names[side]}</span>{' '}
            <Link to={`r/${compare[side].id}`} className="compare-legend-link">
              {compare[side].type}
            </Link>
          </li>
        ))}
      </ul>

      <section className="compare-similarity">
        <p className="compare-similarity-value">{Math.round(compare.similarity)}%</p>
        <h2 className="compare-similarity-label">{SIMILARITY_LABEL}</h2>
        <p className="compare-similarity-note">{SIMILARITY_NOTE}</p>
      </section>

      <ul className="compare-axes">
        {compare.axes.map((axis) => (
          <li key={axis.axis} className="compare-axis" data-axis={axis.axis} data-alike={axis.alike}>
            <h2 className="compare-axis-title">
              {axis.a.left.name} and {axis.a.right.name}
            </h2>
            <p className="compare-axis-tag">{axis.alike ? 'Alike' : 'Different'}</p>
            <PairScale axis={axis} />
            <p className="compare-axis-ends" aria-hidden="true">
              <span>{axis.a.left.name}</span>
              <span>{axis.a.right.name}</span>
            </p>
            <p className="compare-axis-sides">
              <span className="compare-axis-side" data-side="a">
                {names.a}: {axis.a.headline}
              </span>{' '}
              <span className="compare-axis-side" data-side="b">
                {names.b}: {axis.b.headline}
              </span>
            </p>
          </li>
        ))}
      </ul>

      {compare.couple ? (
        <section className="compare-couple">
          <h2 className="compare-couple-title">Couple report</h2>
          {compare.couple.map((section) => (
            <article key={section.axis} className="compare-couple-section" data-axis={section.axis}>
              <h3 className="compare-couple-heading">
                <span className="compare-couple-tag">{section.heading}</span> {section.title}
              </h3>
              <Prose body={section.body} />
              <h4 className="compare-couple-questions-title">Questions to talk through</h4>
              <ul className="compare-couple-questions">
                {section.questions.map((question) => (
                  <li key={question}>{question}</li>
                ))}
              </ul>
            </article>
          ))}
        </section>
      ) : (
        <section className="compare-offer">
          <h2 className="compare-couple-title">Couple report</h2>
          <p className="compare-offer-lead">
            For each of the four scales: whether the two of you are alike or different, what that
            tends to mean day to day, and four questions to talk through together.
          </p>

          {compare.revoked && (
            <div className="compare-unconfirmed" data-state="revoked" role="status">
              <p>This payment was refunded or disputed, so it does not unlock the couple report.</p>
              <p>Questions? Write to {CONTACT_EMAIL}.</p>
            </div>
          )}
          {unconfirmed && (
            <div className="compare-unconfirmed" role="status">
              <p>We could not confirm a payment yet. If you paid, wait a few seconds and check again.</p>
              <button type="button" className="compare-check" onClick={onCheckAgain}>
                Check again
              </button>
            </div>
          )}

          <div className="compare-buy">
            <button
              type="button"
              className="compare-unlock"
              onClick={() => void unlock('couple')}
              disabled={starting || closed}
              data-state={closed ? 'closed' : 'open'}
            >
              {closed ? CLOSED_LABEL : 'Unlock the couple report'}
            </button>
            <p className="compare-price">{priceLine(getProduct('couple'))}</p>
          </div>

          {own && !a.reportUnlocked && (
            <div className="compare-buy" data-product="both">
              <button
                type="button"
                className="compare-unlock-both"
                onClick={() => void unlock('both')}
                disabled={starting || closed}
                data-state={closed ? 'closed' : 'open'}
              >
                {closed ? CLOSED_LABEL : 'Unlock it with your full report'}
              </button>
              <p className="compare-price">{priceLine(getProduct('both'))}</p>
              <p className="compare-note">
                The couple report, plus the full report for your own result.
              </p>
            </div>
          )}

          <p className="compare-note">
            You pay on Stripe. Once it is unlocked, anyone who has the link to this comparison can
            read the couple report.
          </p>
          {failed && (
            <p className="compare-error" role="alert">
              Checkout could not be started. Try again.
            </p>
          )}
          <PassOffer back={`c/${a.id}/${b.id}`} />
        </section>
      )}

      <section className="compare-share">
        <button type="button" className="compare-share-button" onClick={() => void shareComparison()}>
          Send this comparison
        </button>
        <p className="compare-note">Anyone who has the link can see both results.</p>
        {message && (
          <p className="compare-message" role="status">
            {message}
          </p>
        )}
      </section>
    </main>
  );
}

interface ComparePageProps {
  a: string;
  b: string;
  sessionId: string | null;
}

export function ComparePage({ a, b, sessionId }: ComparePageProps) {
  const { state, retry } = useCompare(a, b, sessionId);
  const ownIds = useLoaded(loadOwnIds);

  if (state.status === 'notFound') {
    return (
      <main className="compare" data-state="notFound">
        <h1 className="compare-title">Comparison not found</h1>
        <p>One of these results does not exist. It may have been deleted.</p>
        <p>
          <Link to="" className="home-link">
            Go to the personality test
          </Link>
        </p>
      </main>
    );
  }

  if (state.status === 'error') {
    return (
      <main className="compare" data-state="error">
        <h1 className="compare-title">The comparison could not be loaded</h1>
        <p role="alert">Check your connection and try again.</p>
        <button type="button" className="compare-retry" onClick={retry}>
          Try again
        </button>
      </main>
    );
  }

  // Wait for the local lookup too, so the page does not flip between "You" and "First".
  if (state.status === 'loading' || ownIds === undefined) {
    return (
      <main className="compare" data-state="loading">
        <h1 className="compare-title">Comparison</h1>
        <p className="compare-loading">Loading the comparison.</p>
      </main>
    );
  }

  // Your own result goes first, whichever way round the link has them.
  const ownFirst = ownIds.includes(state.compare.a.id);
  const ownSecond = !ownFirst && ownIds.includes(state.compare.b.id);
  return (
    <CompareView
      compare={ownSecond ? swapSides(state.compare) : state.compare}
      own={ownFirst || ownSecond}
      unconfirmed={state.unconfirmed}
      onCheckAgain={retry}
    />
  );
}
