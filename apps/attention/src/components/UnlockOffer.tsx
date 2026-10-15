import { FREE_DAYS } from '../lib/limits';
import { getProduct, priceLine } from '../lib/products';
import { Link } from './Link';

/** Shown instead of Begin once the free days are used. The test stays free. */
export function UnlockOffer() {
  return (
    <section className="unlock-offer" aria-labelledby="unlock-offer-title">
      <h2 id="unlock-offer-title" className="unlock-offer-title">
        Your {FREE_DAYS} free days are done
      </h2>
      <p>The lifetime unlock opens the full 30-day program, longer sessions and your full history.</p>
      <p className="price">{priceLine(getProduct('lifetime'))}</p>
      <Link to="unlock" className="button button-primary">
        See the lifetime unlock
      </Link>
      <p className="unlock-offer-note">
        The attention test stays free. <Link to="test">Take the test</Link>
      </p>
    </section>
  );
}
