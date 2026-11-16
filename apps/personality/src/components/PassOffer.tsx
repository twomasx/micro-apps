import { usePaymentsStatus } from '../hooks/usePaymentsStatus.ts';
import { passOfferLine } from '../lib/pass-offer.ts';
import { Link } from './Link.tsx';

/**
 * The all-app pass, offered under Personality's own unlock, and the way in for someone who already has a code.
 * `back` is this page's path, like 'r/abc/report', so entering a code returns here.
 */
export function PassOffer({ back }: { back: string | null }) {
  const status = usePaymentsStatus();
  const restore = back ? `restore?back=${encodeURIComponent(back)}` : 'restore';
  return (
    <div className="pass-offer">
      <p className="pass-offer-line">
        {passOfferLine()} <a href={`${status?.passOrigin ?? ''}/pass/`}>See the PolymadLabs pass</a>
      </p>
      <p className="pass-offer-code">
        Have an unlock code or a PolymadLabs pass? <Link to={restore}>Enter your code</Link>
      </p>
    </div>
  );
}
