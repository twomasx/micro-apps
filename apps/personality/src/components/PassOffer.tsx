import { usePaymentsStatus } from '../hooks/usePaymentsStatus.ts';
import { passOfferLine } from '../lib/pass-offer.ts';
import { Link } from './Link.tsx';

/**
 * The all-app pass, offered under a report's own unlock, and the way in for someone who already has one.
 * `back` is this page's path, like 'r/abc/report', so entering a code returns here.
 */
export function PassOffer({ back }: { back: string }) {
  const status = usePaymentsStatus();
  return (
    <div className="pass-offer">
      <p className="pass-offer-line">
        {passOfferLine()} <a href={`${status?.passOrigin ?? ''}/pass/`}>See the PolymadLabs pass</a>
      </p>
      <p className="pass-offer-code">
        Have a PolymadLabs pass? <Link to={`pass?back=${encodeURIComponent(back)}`}>Enter your pass code</Link>
      </p>
    </div>
  );
}
