import { forgetCheckoutInAddress } from '@micro/payments/client';
import { CONTACT_EMAIL } from '@micro/payments/contact';
import { useEffect, useState } from 'react';
import { CodeCard } from '../components/CodeCard.tsx';
import { Link } from '../components/Link.tsx';
import { UnlockOffer } from '../components/UnlockOffer.tsx';
import { useLoaded } from '../hooks/useLoaded.ts';
import { fetchPurchase } from '../lib/api.ts';
import { loadUnlock, loadUnlockBack, saveUnlockBack } from '../lib/store.ts';
import { confirmPurchase, unlockWithCode, type PurchaseState } from '../lib/unlock.ts';

/** Where to go after buying: the report or comparison the buyer came from, or the test. */
function BackLink({ back }: { back: string | null }) {
  if (!back) {
    return (
      <Link to="" className="unlock-back">
        Go to the personality test
      </Link>
    );
  }
  return (
    <Link to={back} className="unlock-back">
      {back.startsWith('c/') ? 'Back to the comparison' : 'Back to the report'}
    </Link>
  );
}

/** The page Stripe sends the buyer back to: confirm the payment, keep the code, show it. */
function Returned({ sessionId }: { sessionId: string }) {
  const [state, setState] = useState<PurchaseState>({ kind: 'checking' });
  const [attempt, setAttempt] = useState(0);
  const [back, setBack] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void confirmPurchase(sessionId, {
      fetchPurchase,
      wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
      cancelled: () => cancelled,
    }).then(async (result) => {
      if (cancelled) return;
      if (result.kind === 'paid') {
        await unlockWithCode(result.code);
        setBack(await loadUnlockBack());
        await saveUnlockBack(null);
        // A shared or bookmarked address must not show the code.
        forgetCheckoutInAddress();
      }
      setState(result);
    });
    return () => {
      cancelled = true;
    };
  }, [sessionId, attempt]);

  const retry = (
    <button
      type="button"
      className="unlock-check"
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
        <p role="status" className="unlock-status">
          Checking your payment.
        </p>
      );
    case 'paid':
      return (
        <>
          <p role="status" className="unlock-status" data-state="paid">
            Thank you. Personality is unlocked on this device.
          </p>
          <CodeCard code={state.code} />
          <p>
            <BackLink back={back} />
          </p>
        </>
      );
    case 'pending':
      return (
        <>
          <p role="status" className="unlock-status">
            Your payment is not confirmed yet.
          </p>
          <p>This can take a minute.</p>
          {retry}
        </>
      );
    case 'offline':
      return (
        <>
          <p role="status" className="unlock-status">
            We could not reach the server to check your payment.
          </p>
          <p>Check your connection and try again.</p>
          {retry}
        </>
      );
    case 'revoked':
      return (
        <>
          <p role="status" className="unlock-status" data-state="revoked">
            This payment was refunded or disputed, so it does not unlock Personality.
          </p>
          <p>Questions? Write to {CONTACT_EMAIL}.</p>
        </>
      );
    case 'notFound':
      return (
        <>
          <p role="status" className="unlock-status">
            We could not find this payment.
          </p>
          <p>
            If you paid and have your unlock code,{' '}
            <Link to="restore" className="unlock-inline-link">
              enter it on the restore page
            </Link>
            .
          </p>
        </>
      );
  }
}

/** /unlock: the offer, the code after buying, or the code already on this device. */
export function UnlockPage({ sessionId, back }: { sessionId: string | null; back: string | null }) {
  const saved = useLoaded(loadUnlock);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  let body;
  if (sessionId) body = <Returned sessionId={sessionId} />;
  else if (saved === undefined) body = null;
  else if (saved)
    body = (
      <>
        <p role="status" className="unlock-status" data-state="paid">
          This device has a Personality unlock code.
        </p>
        <CodeCard code={saved.code} />
        <p>
          <BackLink back={back} />
        </p>
      </>
    );
  else body = <UnlockOffer back={back} />;

  return (
    <main className="unlock-page">
      <p className="unlock-kicker">Personality</p>
      <h1 className="unlock-title">Lifetime unlock</h1>
      {body}
    </main>
  );
}
