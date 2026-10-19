import { useEffect, useState } from 'react';
import { Link } from '../components/Link';
import { PassOffer } from '../components/PassOffer';
import { useUnlocked } from '../hooks/useUnlocked';
import { useSavedUnlock } from '../hooks/useSavedUnlock';
import { CLOSED_LABEL, isClosedResponse } from '@micro/payments/client';
import { CONTACT_EMAIL } from '@micro/payments/contact';
import { usePaymentsStatus } from '../hooks/usePaymentsStatus';
import { ApiError, fetchPurchase, startCheckout } from '../lib/api';
import { unlockWithCode } from '../lib/unlock-state';
import { leaveTo, onPageRestored } from '../lib/navigation';
import { getProduct, priceLine } from '../lib/products';
import { confirmPurchase, type PurchaseState } from '../lib/unlock';
import { SAVE_CODE_LINE, UNLOCK_ADDS } from '../lib/unlock-copy';
import '../styles/page.css';

/** Shows the code with a copy button and the line that tells the buyer to keep it. */
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
      <p>{SAVE_CODE_LINE}</p>
      <button type="button" className="button-quiet code-copy" onClick={copy}>
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
  // Back from Stripe's page can show this page as it was left, with the button still waiting.
  useEffect(() => onPageRestored(() => setBusy(false)), []);
  const closed = status?.enabled === false || closedByServer;
  const product = getProduct('lifetime');

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
      <p className="page-strong">Everything in Breathwork, on this device and any other where you enter your code.</p>
      <ul className="page-list adds-list">
        {UNLOCK_ADDS.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <p className="price-line">{priceLine(product)}</p>
      <button
        type="button"
        className="page-button"
        onClick={buy}
        disabled={busy || closed}
        aria-busy={busy}
        data-state={closed ? 'closed' : 'open'}
      >
        {closed ? CLOSED_LABEL : busy ? 'Opening checkout' : 'Buy the lifetime unlock'}
      </button>
      <p role="status" className="page-status">
        {failed ? 'The checkout could not open. Check your connection and try again.' : ''}
      </p>
      <p>You pay on Stripe's checkout page. There is no account to make.</p>
      <PassOffer />
      <p>
        Bought it already?{' '}
        <Link to="restore" className="inline-link">
          Restore your purchase
        </Link>
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
    <button type="button" className="page-button" onClick={() => {
        setState({ kind: 'checking' });
        setAttempt((n) => n + 1);
      }}>
      Check again
    </button>
  );

  switch (state.kind) {
    case 'checking':
      return (
        <p role="status" className="page-strong">
          Checking your payment.
        </p>
      );
    case 'paid':
      return (
        <>
          <p role="status" className="page-strong">
            Thank you. Breathwork is unlocked on this device.
          </p>
          <CodeCard code={state.code} />
          <Link to="" className="page-button">
            Back to breathing
          </Link>
        </>
      );
    case 'pending':
      return (
        <>
          <p role="status" className="page-strong">
            Your payment is not confirmed yet.
          </p>
          <p>This can take a minute.</p>
          {retry}
        </>
      );
    case 'offline':
      return (
        <>
          <p role="status" className="page-strong">
            We could not reach the server to check your payment.
          </p>
          <p>Check your connection and try again.</p>
          {retry}
        </>
      );
    case 'revoked':
      return (
        <>
          <p role="status" className="page-strong">
            This payment was refunded or disputed, so it does not unlock Breathwork.
          </p>
          <p>Questions? Write to {CONTACT_EMAIL}.</p>
        </>
      );
    case 'notFound':
      return (
        <>
          <p role="status" className="page-strong">
            We could not find this payment.
          </p>
          <p>
            If you paid and have your unlock code,{' '}
            <Link to="restore" className="inline-link">
              enter it on the restore page
            </Link>
            .
          </p>
        </>
      );
  }
}

export function UnlockPage({ sessionId }: { sessionId: string | null }) {
  const unlocked = useUnlocked();
  const saved = useSavedUnlock(unlocked);

  let body;
  if (sessionId) body = <Returned sessionId={sessionId} />;
  else if (unlocked && saved?.valid)
    body = (
      <>
        <p role="status" className="page-strong">
          Breathwork is unlocked on this device.
        </p>
        <CodeCard code={saved.code} />
      </>
    );
  else if (unlocked) body = <p className="page-strong">Breathwork is unlocked on this device.</p>;
  else body = <Offer />;

  return (
    <main className="page">
      <p>
        <Link to="" className="page-back">
          Back to breathing
        </Link>
      </p>
      <h1 className="page-title">Lifetime unlock</h1>
      {body}
    </main>
  );
}
