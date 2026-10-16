import { usePaymentsStatus } from '../hooks/usePaymentsStatus';
import { passOfferLine } from '../lib/pass-offer';

/** The all-app pass, offered under this app's own unlock. The pass page lives with the pass service. */
export function PassOffer() {
  const status = usePaymentsStatus();
  return (
    <p className="pass-offer">
      {passOfferLine()} <a href={`${status?.passOrigin ?? ''}/pass/`}>See the PolymadLabs pass</a>
    </p>
  );
}
