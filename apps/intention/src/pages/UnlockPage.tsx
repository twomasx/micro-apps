import { useEffect, useState } from 'react';
import { Link } from '../components/Link.tsx';
import { PassOffer } from '../components/PassOffer.tsx';
import { useSavedUnlock } from '../hooks/useSavedUnlock.ts';
import { useUnlocked } from '../hooks/useUnlocked.ts';
import { CLOSED_LABEL, isClosedResponse } from '@micro/payments/client';
import { CONTACT_EMAIL } from '@micro/payments/contact';
import { usePaymentsStatus } from '../hooks/usePaymentsStatus.ts';
import { ApiError, fetchPurchase, startCheckout } from '../lib/api.ts';
import { leaveTo } from '../lib/navigation.ts';
import { priceLine } from '../lib/products.ts';
import { confirmPurchase, type PurchaseState } from '../lib/unlock.ts';
import { ALWAYS_FREE, LAB_PASS_ADDS, SAVE_CODE_LINE } from '../lib/unlock-copy.ts';
import { unlockWithCode } from '../lib/unlock-state.ts';

/** The code, a copy button and the line that tells the buyer to keep it. */
export function CodeCard({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(code).then(
      () => setCopied(true),
      () => setCopied(false),
    );
  };
  return (
    <div className="code-card">
      <p className="code-label">Your unlock code</p>
      <p className="code" translate="no">
        {code}
      </p>
      <p className="muted">{SAVE_CODE_LINE}</p>
      <button type="button" className="button-secondary" onClick={copy}>
        {copied ? 'Copied' : 'Copy the code'}
      </button>
    </div>
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
    <>
      <p className="lead">Everything in Intention, on this device and any other where you enter your code.</p>
      <ul className="bullets">
        {LAB_PASS_ADDS.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <p className="muted">{ALWAYS_FREE}</p>
      <p className="price-big">
        {/* "$4.99 once." and "No renewals." on their own lines, so it never breaks mid-phrase. */}
        {priceLine()
          .split(/(?<=\.) /)
          .map((part) => (
            <span key={part} className="price-part">
              {part}{' '}
            </span>
          ))}
      </p>
      <button
        type="button"
        className="button-primary"
        onClick={buy}
        disabled={busy || closed}
        aria-busy={busy}
        data-state={closed ? 'closed' : 'open'}
      >
        {closed ? CLOSED_LABEL : busy ? 'Opening checkout' : 'Buy Lab Pass'}
      </button>
      <p role="status" className="status-line">
        {failed ? 'The checkout could not open. Check your connection and try again.' : ''}
      </p>
      <p className="muted">You pay on Stripe's checkout page. There is no account to make.</p>
      <PassOffer />
      <p className="muted">
        Bought it already? <Link to="restore">Restore Lab Pass</Link>
      </p>
    </>
  );
}

function Returned({ sessionId }: { sessionId: string }) {
  const [state, setState] = useState<PurchaseState>({ kind: 'checking' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void confirmPurchase(sessionId, {
      fetchPurchase,
      wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
      cancelled: () => cancelled,
    }).then(async (result) => {
      if (cancelled) return;
      if (result.kind === 'paid') await unlockWithCode(result.code);
      setState(result);
    });
    return () => {
      cancelled = true;
    };
  }, [sessionId, attempt]);

  const retry = (
    <button
      type="button"
      className="button-primary"
      onClick={() => {
        setState({ kind: 'checking' });
        setAttempt((n) => n + 1);
      }}
    >
      Check again
    </button>
  );

  switch (state.kind) {
    case 'checking':
      return (
        <p role="status" className="lead">
          Checking your payment.
        </p>
      );
    case 'paid':
      return (
        <>
          <p role="status" className="lead">
            Thank you. Lab Pass is on for this device.
          </p>
          <CodeCard code={state.code} />
          <Link to="" className="button-primary">
            Back to Intention
          </Link>
        </>
      );
    case 'pending':
      return (
        <>
          <p role="status" className="lead">
            Your payment is not confirmed yet.
          </p>
          <p>This can take a minute.</p>
          {retry}
        </>
      );
    case 'offline':
      return (
        <>
          <p role="status" className="lead">
            We could not reach the server to check your payment.
          </p>
          <p>Check your connection and try again.</p>
          {retry}
        </>
      );
    case 'revoked':
      return (
        <>
          <p role="status" className="lead">
            This payment was refunded or disputed, so it does not turn on Lab Pass.
          </p>
          <p>Questions? Write to {CONTACT_EMAIL}.</p>
        </>
      );
    case 'notFound':
      return (
        <>
          <p role="status" className="lead">
            We could not find this payment.
          </p>
          <p>
            If you paid and have your unlock code, <Link to="restore">enter it on the restore page</Link>.
          </p>
        </>
      );
  }
}

/** What Lab Pass adds, the price and the buy button. Stripe sends the buyer back here. */
export function UnlockPage({ sessionId }: { sessionId: string | null }) {
  const unlocked = useUnlocked();
  const saved = useSavedUnlock(unlocked);

  let body;
  if (sessionId) body = <Returned sessionId={sessionId} />;
  else if (unlocked)
    body = (
      <>
        <p role="status" className="lead">
          Lab Pass is on for this device.
        </p>
        <ul className="bullets">
          {LAB_PASS_ADDS.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        {saved && <CodeCard code={saved.code} />}
      </>
    );
  else body = <Offer />;

  return (
    <main className="page unlock">
      <nav className="page-nav">
        <Link to="" className="back-link">
          Back to Intention
        </Link>
      </nav>
      <h1 className="page-title">Lab Pass</h1>
      {body}
    </main>
  );
}
