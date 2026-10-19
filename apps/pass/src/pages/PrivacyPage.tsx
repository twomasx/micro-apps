import { useEffect } from 'react';
import { Link } from '../components/Link';
import { CONTACT_EMAIL } from '../lib/copy';

export function PrivacyPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <main className="privacy">
      <p className="eyebrow">Privacy note</p>
      <h1 className="privacy-title">Privacy: the PolymadLabs pass</h1>

      <section className="privacy-section">
        <h2>On our server</h2>
        <p>
          When you buy a pass we keep a record of the purchase: Stripe's id for the payment, the amount, whether it is
          paid, refunded or disputed, and a scrambled form (a hash) of your pass code. We cannot turn the hash back into
          your code. We do not store your name, your email address or any card details.
        </p>
        <p>
          When an app checks your pass, it sends the code and a random device id that the app made on your device. We
          keep the device ids that used each code, with the day each was first and last seen, to stop one code being
          shared widely. A device id says nothing about who you are.
        </p>
        <p>
          For each day a code is checked, we keep a scrambled form of the network addresses it was checked from, to
          spot a code used from many places. The addresses themselves are not kept.
        </p>
        <p>
          We keep a log of payments and pass checks: what happened, when, and Stripe's payment id. It has no names,
          emails or card details.
        </p>
        <p>
          We keep purchase records for as long as the pass can be used, and for the time tax law asks us to keep sales
          records. Device ids and log entries are kept for up to 1 year.
        </p>
      </section>

      <section className="privacy-section">
        <h2>At Stripe</h2>
        <p>
          Stripe handles the payment. It asks for your email address to send the receipt. We do not copy it into our
          database.
        </p>
      </section>

      <section className="privacy-section">
        <h2>On your device</h2>
        <p>
          This browser keeps your pass code and a random device id in its own storage for this site, so the pass works
          when you come back. Each app keeps its own copy the same way. Clearing this site's data removes them. You can
          enter your code again at any time.
        </p>
      </section>

      <section className="privacy-section">
        <h2>Contact</h2>
        <p>Questions, a lost code or a refund: {CONTACT_EMAIL}.</p>
      </section>

      <Link to="" className="button-link">
        Back to the pass
      </Link>
    </main>
  );
}
