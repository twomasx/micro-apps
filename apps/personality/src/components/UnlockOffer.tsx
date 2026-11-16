import { CLOSED_LABEL, isClosedResponse } from '@micro/payments/client';
import { useEffect, useState } from 'react';
import { usePaymentsStatus } from '../hooks/usePaymentsStatus.ts';
import { ApiError, startCheckout } from '../lib/api.ts';
import { leaveTo, onPageRestored } from '../lib/navigation.ts';
import { getProduct, priceLine } from '../lib/products.ts';
import { saveUnlockBack } from '../lib/store.ts';
import { UNLOCK_ADDS } from '../lib/unlock.ts';
import { PassOffer } from './PassOffer.tsx';

/**
 * The one-time Personality unlock, offered where something is locked. `back` is this page's path, like
 * 'r/abc/report': after paying, the unlock page shows the code and a link back here.
 */
export function UnlockOffer({ back }: { back: string | null }) {
  const [starting, setStarting] = useState(false);
  const [failed, setFailed] = useState(false);
  const [closedByServer, setClosedByServer] = useState(false);
  const status = usePaymentsStatus();
  // Back from Stripe's page can show this page as it was left, with the button still waiting.
  useEffect(() => onPageRestored(() => setStarting(false)), []);
  const closed = status?.enabled === false || closedByServer;

  const buy = async () => {
    setStarting(true);
    setFailed(false);
    try {
      await saveUnlockBack(back);
      leaveTo(await startCheckout());
    } catch (error) {
      setStarting(false);
      if (error instanceof ApiError && isClosedResponse(error.status)) setClosedByServer(true);
      else setFailed(true);
    }
  };

  return (
    <section className="unlock-offer" data-state={closed ? 'closed' : 'open'}>
      <h2 className="unlock-offer-title">Unlock everything in Personality</h2>
      <ul className="unlock-offer-list">
        {UNLOCK_ADDS.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <p className="unlock-offer-price">{priceLine(getProduct('lifetime'))}</p>
      <button
        type="button"
        className="unlock-offer-button"
        onClick={() => void buy()}
        disabled={starting || closed}
        aria-busy={starting}
        data-state={closed ? 'closed' : 'open'}
      >
        {closed ? CLOSED_LABEL : starting ? 'Opening checkout' : 'Unlock everything'}
      </button>
      <p className="unlock-offer-note">
        You pay on Stripe. You get a code that unlocks Personality on up to 5 devices. There is no account to make.
      </p>
      {failed && (
        <p className="unlock-offer-error" role="alert">
          Checkout could not be started. Check your connection and try again.
        </p>
      )}
      <PassOffer back={back} />
    </section>
  );
}
