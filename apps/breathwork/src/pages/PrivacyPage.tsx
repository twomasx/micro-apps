import { Link } from '../components/Link';
import { HISTORY_DAYS } from '../lib/content';
import '../styles/page.css';

export function PrivacyPage() {
  return (
    <main className="page">
      <p>
        <Link to="" className="page-back">
          Back to breathing
        </Link>
      </p>
      <h1 className="page-title">Privacy</h1>
      <p className="page-strong">
        Breathwork has no accounts, no ads and no tracking. We never ask for your name or email.
      </p>

      <section className="page-section">
        <h2>On this device</h2>
        <p>Breathwork keeps these in your browser's storage on this device:</p>
        <ul className="page-list">
          <li>Your settings: the technique, the session length and whether sound is on.</li>
          <li>Whether you have seen the first screen.</li>
          <li>
            Your finished sessions: the day and time, the technique and its pattern, and the length. They make Your
            week. Sessions older than {HISTORY_DAYS} days are deleted.
          </li>
          <li>The custom patterns you save, up to 5.</li>
          <li>If you bought the lifetime unlock: your unlock code.</li>
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
        <p>We keep this record for as long as Breathwork is online, so your unlock code keeps working.</p>
      </section>

      <section className="page-section">
        <h2>If you use a PolymadLabs pass</h2>
        <p>
          Breathwork keeps your pass code and a random device id in this browser's storage. To check the pass, it sends both
          to the PolymadLabs pass service, at most about once a day. The pass service keeps the device ids that used
          each code, with the day each was first seen, so one code cannot be shared widely. The 
          <a href="https://polymadlabs.com/pass/privacy">pass privacy note</a> has the details.
        </p>
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
          <li>
            No requests to other companies while you breathe. The font comes from this site, and the sounds are made in
            your browser.
          </li>
          <li>No camera and no microphone. Breathwork does not listen to or measure your breathing.</li>
        </ul>
        <p>
          Cloudflare hosts Breathwork. Like any web host, it sees your IP address to send you the page. We do not store
          it.
        </p>
      </section>

      <p>
        <Link to="" className="page-link">
          Back to breathing
        </Link>
      </p>
    </main>
  );
}
