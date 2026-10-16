import { Link } from '../components/Link';
import { MAX_SESSIONS } from '../lib/history';
import { MAX_TESTS } from '../lib/tests';

const count = (n: number) => n.toLocaleString('en-US');

export function PrivacyPage() {
  return (
    <main className="screen page privacy">
      <p>
        <Link to="" className="page-back">
          Back to today
        </Link>
      </p>
      <header>
        <h1 className="title">Privacy</h1>
        <p className="page-strong">
          Attention has no accounts, no ads and no tracking. We never ask for your name or email.
        </p>
      </header>

      <section className="page-section" aria-labelledby="device-title">
        <h2 id="device-title">On this device</h2>
        <p>Attention keeps these in your browser's storage on this device:</p>
        <ul className="page-list">
          <li>Your settings: the volume, whether tick probes are on, your session size, and whether you have seen the first instructions and done the practice round.</li>
          <li>
            Every session: the date and time, the length of each stretch, your answer to each bell, and whether you
            noticed the ticks. These make your circles and your progress.
          </li>
          <li>
            Every attention test: the date, the length, every number shown with your tap times, your scores and the
            screen timing.
          </li>
          <li>If you bought the lifetime unlock: your unlock code.</li>
        </ul>
        <p>
          They stay until you clear this site's data in your browser. Up to {count(MAX_SESSIONS)} sessions and{' '}
          {count(MAX_TESTS)} tests are kept. Past that, the oldest are deleted.
        </p>
      </section>

      <section className="page-section" aria-labelledby="server-title">
        <h2 id="server-title">On our server</h2>
        <p>When you finish an attention test, the app sends a short summary with no name and no device ID:</p>
        <ul className="page-list">
          <li>The test version and length, and whether it is your first, second or later test of that length on this device.</li>
          <li>
            Your scores: taps on a 3, missed numbers, early taps, average reaction time, how much it varied, and the
            attention score.
          </li>
        </ul>
        <p>
          We use these to compare first results with other people's first results. We do not store your IP address
          with them. They are kept for as long as Attention is online. Your sessions, your answers and the individual
          numbers of each test never leave this device.
        </p>
        <p>Only if you buy the lifetime unlock, we also keep one record of the purchase:</p>
        <ul className="page-list">
          <li>The Stripe payment ID.</li>
          <li>A scrambled form of your unlock code (a hash). The code itself cannot be read back from it.</li>
          <li>
            The random device ids that used the code, with the day each was first and last seen. A code works on up to
            5 devices, so it cannot be shared widely.
          </li>
          <li>
            For each day the code is checked, a scrambled form of the network addresses it was checked from, to spot a
            code used from many places. The addresses themselves are not kept.
          </li>
          <li>The amount, the currency, whether it is paid, and the date.</li>
        </ul>
        <p>We keep this record for as long as Attention is online, so your unlock code keeps working.</p>
      </section>

      <section className="page-section" aria-labelledby="pass-title">
        <h2 id="pass-title">If you use a PolymadLabs pass</h2>
        <p>
          Attention keeps your pass code and a random device id in this browser's storage. To check the pass, it sends both
          to the PolymadLabs pass service, at most about once a day. The pass service keeps the device ids that used
          each code, with the day each was first seen, so one code cannot be shared widely. The 
          <a href="https://polymadlabs.com/pass/privacy">pass privacy note</a> has the details.
        </p>
      </section>

      <section className="page-section" aria-labelledby="payments-title">
        <h2 id="payments-title">Payments</h2>
        <p>
          Payments happen on Stripe's checkout page. Stripe asks for your email to send the receipt, and for your card
          details. We do not copy your email or card details into our database. Stripe's own{' '}
          <a href="https://stripe.com/privacy" rel="noreferrer" target="_blank">
            privacy policy
          </a>{' '}
          covers what Stripe keeps.
        </p>
      </section>

      <section className="page-section" aria-labelledby="dont-title">
        <h2 id="dont-title">What we don't do</h2>
        <ul className="page-list">
          <li>No analytics, no ad trackers and no tracking cookies.</li>
          <li>No requests to other companies while you practice. The fonts come from this site, and the sounds are made in your browser.</li>
          <li>No camera and no microphone. Attention does not listen to or measure your breathing.</li>
        </ul>
        <p>
          Cloudflare hosts Attention. Like any web host, it sees your IP address to send you the page. We do not store
          it.
        </p>
      </section>

      <p>
        <Link to="" className="page-link">
          Back to today
        </Link>
      </p>
    </main>
  );
}
