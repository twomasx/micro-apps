import { useEffect } from 'react';
import { Link } from '../components/Link';
import '../styles/page.css';

export function PrivacyPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <main className="page">
      <p>
        <Link to="" className="page-back">
          Back to the player
        </Link>
      </p>
      <h1 className="page-title">Privacy</h1>
      <p className="page-strong">
        Focus has no accounts, no ads and no tracking. We never ask for your name or email.
      </p>

      <section className="page-section">
        <h2>On this device</h2>
        <p>Focus keeps these in your browser's storage on this device:</p>
        <ul className="page-list">
          <li>Your settings: the preset, the mode and length, the volume and the noise layer.</li>
          <li>Whether you have seen the first screen and started a session before.</li>
          <li>If you bought the lifetime unlock: your unlock code.</li>
          <li>If you bought the lifetime unlock: your session history (the date, the preset and the length).</li>
        </ul>
        <p>
          They stay until you clear this site's data in your browser. They never leave this device, except your unlock
          code, which is sent to our server to check it.
        </p>
      </section>

      <section className="page-section">
        <h2>On our server</h2>
        <p>Only if you buy the lifetime unlock, we keep one record of the purchase:</p>
        <ul className="page-list">
          <li>The Stripe payment ID.</li>
          <li>A scrambled form of your unlock code (a hash). The code itself cannot be read back from it.</li>
          <li>The amount, the currency, whether it is paid, and the date.</li>
        </ul>
        <p>We keep this record for as long as Focus is online, so your unlock code keeps working.</p>
      </section>

      <section className="page-section">
        <h2>Payments</h2>
        <p>
          Payments happen on Stripe's checkout page. Stripe asks for your email to send the receipt, and for your card
          details. We do not copy your email or card details into our database. Stripe's own{' '}
          <a href="https://stripe.com/privacy" rel="noreferrer" target="_blank">
            privacy policy
          </a>{' '}
          covers what Stripe keeps.
        </p>
      </section>

      <section className="page-section">
        <h2>What we don't do</h2>
        <ul className="page-list">
          <li>No analytics, no ad trackers and no tracking cookies.</li>
          <li>No requests to other companies while you listen. The fonts and the sound come from this site and your browser.</li>
          <li>No microphone. Focus does not listen to you or check for headphones.</li>
        </ul>
        <p>
          Cloudflare hosts Focus. Like any web host, it sees your IP address to send you the page. We do not store it.
        </p>
      </section>

      <p>
        <Link to="" className="page-link">
          Back to the player
        </Link>
      </p>
    </main>
  );
}
