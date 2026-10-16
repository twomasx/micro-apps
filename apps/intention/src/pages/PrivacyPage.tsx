import { Link } from '../components/Link.tsx';

/** What is stored, where, and for how long. */
export function PrivacyPage() {
  return (
    <main className="page prose">
      <nav className="page-nav">
        <Link to="" className="back-link">
          Back to Intention
        </Link>
      </nav>
      <h1 className="page-title">Privacy</h1>
      <p className="lead">Intention has no accounts, no ads and no tracking. We never ask for your name or email.</p>

      <section aria-labelledby="device-title">
        <h2 id="device-title">On this device</h2>
        <p>Intention keeps these in your browser's storage on this device:</p>
        <ul className="bullets">
          <li>A random id for this device, made the first time you open the app. It ties your runs together. It says nothing about you.</li>
          <li>The colors you picked.</li>
          <li>If you bought Lab Pass: your unlock code.</li>
        </ul>
        <p>They stay until you clear this site's data in your browser.</p>
      </section>

      <section aria-labelledby="server-title">
        <h2 id="server-title">On our server</h2>
        <p>Every run you start is stored on our server with:</p>
        <ul className="bullets">
          <li>A random run id and this device's random id.</li>
          <li>When it started, its planned length, which color you were given (left or right) and the random source.</li>
          <li>Every bit of the run, and when each batch of bits was sent.</li>
          <li>Its score, whether it was stopped early, and whether it was during Intention Hour.</li>
        </ul>
        <p>
          No name, no email and no IP address are stored with a run. Runs are kept for as long as Intention is online
          and cannot be removed from the totals: counting every run that starts is the rule that keeps the experiment
          honest.
        </p>
        <p>
          The global page shows only totals, never device ids. Anyone with the link to one run's bits can see that run,
          but not who made it. Your runs page is found by this device's id, so another device does not see your runs.
        </p>
        <p>Only if you buy Lab Pass, we also keep one record of the purchase:</p>
        <ul className="bullets">
          <li>The Stripe payment id.</li>
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
        <p>We keep this record for as long as Intention is online, so your unlock code keeps working.</p>
      </section>

      <section aria-labelledby="pass-title">
        <h2 id="pass-title">If you use a PolymadLabs pass</h2>
        <p>
          Intention keeps your pass code and a random device id in this browser's storage. To check the pass, it sends both
          to the PolymadLabs pass service, at most about once a day. The pass service keeps the device ids that used
          each code, with the day each was first seen, so one code cannot be shared widely. The 
          <a href="https://polymadlabs.com/pass/privacy">pass privacy note</a> has the details.
        </p>
      </section>

      <section aria-labelledby="payments-title">
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

      <section aria-labelledby="dont-title">
        <h2 id="dont-title">What we don't do</h2>
        <ul className="bullets">
          <li>No analytics, no ad trackers and no tracking cookies.</li>
          <li>No requests to other companies while you use the app. The fonts come from this site.</li>
          <li>No camera, no microphone and no location.</li>
        </ul>
        <p>
          Cloudflare hosts Intention. Like any web host, it sees your IP address to send you the page. We do not store
          it.
        </p>
      </section>
    </main>
  );
}
