import { CLOSED_LABEL, isClosedResponse } from '@micro/payments/client';
import { useEffect, useState } from 'react';
import { AppLinks } from '../components/AppLinks';
import { CodeCard } from '../components/CodeCard';
import { Link } from '../components/Link';
import { usePass } from '../hooks/usePass';
import { usePaymentsStatus } from '../hooks/usePaymentsStatus';
import { ApiError, startCheckout } from '../lib/api';
import { priceLine, TERMS } from '../lib/copy';
import { leaveTo } from '../lib/navigation';
import apps from '../../config/apps.json';

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
    <>
      <p className="pass-lead">
        One pass unlocks everything in every PolymadLabs app, on any device where you enter your code. That includes
        apps we add later.
      </p>
      <ul className="pass-apps">
        {apps.apps.map((app) => (
          <li key={app.app} data-app={app.app}>
            <strong>{app.name}:</strong> {app.covers.charAt(0).toLowerCase() + app.covers.slice(1)}.
          </li>
        ))}
      </ul>
      <p className="pass-price">{priceLine()}</p>
      <button
        type="button"
        className="pass-buy"
        onClick={buy}
        disabled={busy || closed}
        aria-busy={busy}
        data-state={closed ? 'closed' : 'open'}
      >
        {closed ? CLOSED_LABEL : busy ? 'Opening checkout' : 'Buy the pass'}
      </button>
      <p role="status" className="pass-status">
        {failed ? 'The checkout could not open. Check your connection and try again.' : ''}
      </p>
      <p>You pay on Stripe's checkout page. There is no account to make.</p>
      <p>
        Have a pass code already? <Link to="restore">Enter your code</Link>
      </p>
    </>
  );
}

export function HomePage() {
  const { active, code } = usePass();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <main className="pass" data-state={active ? 'has-pass' : 'offer'}>
      <h1 className="pass-title">Every PolymadLabs app</h1>
      {active && code ? (
        <>
          <p role="status" className="pass-lead">
            Your pass is on this device.
          </p>
          <CodeCard code={code} />
          <AppLinks code={code} />
        </>
      ) : (
        <Offer />
      )}
      <section className="pass-terms" aria-labelledby="terms-title">
        <h2 id="terms-title">What the pass covers</h2>
        {TERMS.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </section>
      <footer className="pass-footer">
        <Link to="privacy">Privacy</Link> <a href="/">PolymadLabs</a>
      </footer>
    </main>
  );
}
