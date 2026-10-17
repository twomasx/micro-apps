import { CLOSED_LABEL, isClosedResponse } from '@micro/payments/client';
import { useEffect, useState } from 'react';
import { AppLinks } from '../components/AppLinks';
import { CodeCard } from '../components/CodeCard';
import { Link } from '../components/Link';
import { usePass } from '../hooks/usePass';
import { usePaymentsStatus } from '../hooks/usePaymentsStatus';
import { ApiError, startCheckout } from '../lib/api';
import { amountLabel, ONE_TIME, TERMS } from '../lib/copy';
import { leaveTo } from '../lib/navigation';
import apps from '../../config/apps.json';

/** What the pass unlocks, one row per app, like the landing page's study sheet. */
function CoverSheet() {
  return (
    <dl className="pass-apps">
      {apps.apps.map((app, index) => (
        <div key={app.app} className="pass-app" data-app={app.app}>
          <dt>
            <span className="pass-app-number" aria-hidden="true">
              {String(index + 1).padStart(2, '0')}
            </span>
            {app.name}
          </dt>
          <dd>{app.covers}</dd>
        </div>
      ))}
      <div className="pass-app" data-app="later">
        <dt>
          <span className="pass-app-number" aria-hidden="true">
            +
          </span>
          Apps we add later
        </dt>
        <dd>Included</dd>
      </div>
    </dl>
  );
}

function Offer() {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [closedByServer, setClosedByServer] = useState(false);
  const status = usePaymentsStatus();
  const closed = status?.enabled === false || closedByServer;

  const buy = () => {
    setBusy(true);
    setFailed(false);
    startCheckout().then(leaveTo, (error: unknown) => {
      setBusy(false);
      if (error instanceof ApiError && isClosedResponse(error.status)) setClosedByServer(true);
      else setFailed(true);
    });
  };

  return (
    <aside className="pass-sheet" aria-labelledby="sheet-title">
      <h2 className="pass-sheet-title" id="sheet-title">
        What the pass unlocks
      </h2>
      <CoverSheet />
      <div className="pass-checkout">
        <p className="pass-price">
          <span className="pass-amount">{amountLabel()}</span> <span className="pass-once">{ONE_TIME}</span>
        </p>
        <button
          type="button"
          className="pass-buy"
          onClick={buy}
          disabled={busy || closed}
          aria-busy={busy}
          data-state={closed ? 'closed' : busy ? 'busy' : 'open'}
        >
          {closed ? CLOSED_LABEL : busy ? 'Opening checkout' : 'Buy the pass'}
          {!closed && !busy && (
            <span className="pass-arrow" aria-hidden="true">
              &#8594;
            </span>
          )}
        </button>
        <p role="status" className="pass-status">
          {failed ? 'The checkout could not open. Check your connection and try again.' : ''}
        </p>
        <p className="pass-note">You pay on Stripe's checkout page. There is no account to make.</p>
      </div>
    </aside>
  );
}

export function HomePage() {
  const { active, code } = usePass();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <main className="pass" data-state={active ? 'has-pass' : 'offer'}>
      <section className="pass-hero" aria-labelledby="pass-title">
        <div className="pass-hero-text">
          <p className="eyebrow">{active ? 'Your pass' : 'One purchase'}</p>
          <h1 className="pass-title" id="pass-title">
            Every PolymadLabs app
          </h1>
          {active && code ? (
            <p role="status" className="pass-lead">
              Your pass is on this device. Open any app below and it is already unlocked.
            </p>
          ) : (
            <>
              <p className="pass-lead">
                One pass unlocks everything in every PolymadLabs app, on any device where you enter your code. That
                includes apps we add later.
              </p>
              <p className="pass-have-code">
                Have a pass code already? <Link to="restore">Enter your code</Link>
              </p>
            </>
          )}
        </div>
        {active && code ? <CodeCard code={code} /> : <Offer />}
      </section>

      {active && code && <AppLinks code={code} />}

      <section className="pass-terms" aria-labelledby="terms-title">
        <div className="section-head">
          <h2 id="terms-title">What the pass covers</h2>
        </div>
        <ol className="pass-terms-list">
          {TERMS.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ol>
      </section>
    </main>
  );
}
