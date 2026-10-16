import { Link } from '../components/Link.tsx';
import { HOUR } from '../lib/hour.ts';

/** The research history, how a run works and how it is scored, in plain words with sources. */
export function SciencePage() {
  return (
    <main className="page prose">
      <nav className="page-nav">
        <Link to="" className="back-link">
          Back to the tug
        </Link>
      </nav>
      <h1 className="page-title">The science</h1>
      <p className="lead">
        Can your mind move a random number? Nobody has proven it. Nobody has proven it impossible either. This app lets
        you test it yourself, under rules that make cheating impossible.
      </p>

      <section aria-labelledby="history-title">
        <h2 id="history-title">What the research found</h2>
        <p>
          From 1979 to 2007, the Princeton Engineering Anomalies Research lab (PEAR), led by Robert Jahn and Brenda
          Dunne, asked people to push a random number generator toward more 1s or more 0s. Over millions of trials they
          reported very small effects in the direction people intended.
        </p>
        <p>
          In 2000, three labs in the United States and Germany ran the same kind of experiment together to check. They
          did not confirm the effect.
        </p>
        <p>
          In 2006, Holger Bösch, Fiona Steinkamp and Emil Boller combined 380 studies of intention and random number
          generators. They found an extremely small overall effect. They also found that small studies showed larger
          effects than big ones, a pattern that publication bias could explain: studies that found nothing are less
          likely to be published, which leaves the published ones looking better than the truth.
        </p>
        <p>
          Two replies in the same journal disagreed about what this means. One group argued the effect is real but
          tiny. Another argued the evidence cannot tell a tiny effect apart from no effect at all.
        </p>
        <p>So the honest summary is: no one has shown this convincingly, in either direction.</p>
      </section>

      <section aria-labelledby="run-title">
        <h2 id="run-title">How a run works</h2>
        <ol className="steps">
          <li>You tap Begin. Our server starts a run.</li>
          <li>The server picks your color at random, left or right. You cannot choose it, so no one can pick a side that happens to be lucky.</li>
          <li>
            For 20 seconds the server makes 200 random bits a second, 4,000 in all. Each bit is a 1 or a 0. A 1 pulls
            for the right-hand color, a 0 for the left.
          </li>
          <li>
            Each batch of bits is made at the moment it is sent, never in advance and never faster than real time. Your
            screen shows them as they arrive. Each speck of light is one bit.
          </li>
          <li>The line between the colors sits wherever the score puts it. Nothing is smoothed or exaggerated.</li>
          <li>You can stop early. The run still counts.</li>
        </ol>
      </section>

      <section aria-labelledby="server-title">
        <h2 id="server-title">Why the server makes the bits</h2>
        <p>
          If your phone made the random numbers, a changed app could cheat, or quietly keep only the runs that went
          well. So the server makes every bit, picks your color, stores every bit of every run, and counts every run
          that starts. Runs that go badly cannot be hidden, by you or by us. Each run on your runs page has a link to
          all of its bits.
        </p>
      </section>

      <section aria-labelledby="score-title">
        <h2 id="score-title">How scores are calculated</h2>
        <p>
          Each 1 counts +1 and each 0 counts −1. Added up, toward your color, that is the run's deviation. The score
          divides it by the square root of the number of bits: for a full run, by √4,000, about 63.2. So a run that
          ended 40 bits toward your color scores +0.63.
        </p>
        <p>
          By chance alone, about 68% of runs score between −1 and +1, and about 1 run in 20 scores above +1.65. The
          app says how often chance gets as far as your run did: "About 1 in 6 runs pull this far toward Glacier by
          chance." One run, however high, proves nothing.
        </p>
        <p>
          A run you stop early is scored as if it had run its full length: its deviation is divided by √4,000, not by
          the bits it got. If it were not, stopping whenever you were ahead would lift the scores with no real effect.
          We tested this with 10,000 simulated runs, each stopped as soon as it was ahead. Scored the honest way, they
          averaged 0.005, which is chance.
        </p>
        <p>
          Totals over many runs (yours, everyone's and Intention Hour's) use Stouffer's method: add up the run scores
          and divide by the square root of how many runs there are. Under chance, a total behaves just like one run's
          score, so the same "1 in X" applies.
        </p>
      </section>

      <section aria-labelledby="missing-title">
        <h2 id="missing-title">Psi-missing</h2>
        <p>
          Sometimes results come out reliably below chance, as if the numbers moved away from what people intended.
          Researchers call this psi-missing. The app counts it as just as interesting as a result above chance. A total
          at −1.96 or lower is labeled psi-missing, with how rarely chance does that: about 1 time in 40.
        </p>
      </section>

      <section aria-labelledby="source-title">
        <h2 id="source-title">The random source</h2>
        <p>
          Today the bits are cryptographic random numbers generated on our server, by the same generator used to make
          secure keys. They are not quantum random numbers. Every run records its source. If we add another source
          later, totals will be split by source so they can be compared.
        </p>
      </section>

      <section aria-labelledby="evidence-title">
        <h2 id="evidence-title">What would count as evidence</h2>
        <p>
          The line on the global page would have to leave the shaded area and stay out as more runs come in. Lines
          wander, and by chance alone they leave the inner band about 1 time in 20, so a short trip outside means
          little.
        </p>
        <p>
          The effects reported in the past were tiny. If intention moved one bit in ten thousand, it would take about
          25,000 runs together before the global line would be expected to reach the edge of the inner band, and many
          more before it stayed out. That is why everyone's runs count, and why Intention Hour puts many people on it
          at once, every day at {HOUR.label}.
        </p>
      </section>

      <section aria-labelledby="sources-title">
        <h2 id="sources-title">Sources</h2>
        <ul className="sources">
          <li>
            Jahn, R. G., Dunne, B. J., Nelson, R. D., Dobyns, Y. H. and Bradish, G. J. (1997). Correlations of random
            binary sequences with pre-stated operator intention: a review of a 12-year program. <i>Journal of Scientific
            Exploration</i>, 11(3), 345 to 367.
          </li>
          <li>
            Jahn, R. G., Dunne, B. J., Bradish, G. J., Dobyns, Y. H., Lettieri, A., Nelson, R. D., Mischo, J., Boller,
            E., Bösch, H., Vaitl, D., Houtkooper, J. and Walter, B. (2000). Mind/Machine Interaction Consortium: PortREG
            replication experiments. <i>Journal of Scientific Exploration</i>, 14(4), 499 to 555.
          </li>
          <li>
            Bösch, H., Steinkamp, F. and Boller, E. (2006). Examining psychokinesis: the interaction of human intention
            with random number generators. A meta-analysis. <i>Psychological Bulletin</i>, 132(4), 497 to 523.
          </li>
          <li>
            Radin, D., Nelson, R., Dobyns, Y. and Houtkooper, J. (2006). Reexamining psychokinesis: comment on Bösch,
            Steinkamp, and Boller (2006). <i>Psychological Bulletin</i>, 132(4), 529 to 532.
          </li>
          <li>
            Wilson, D. B. and Shadish, W. R. (2006). On blowing trumpets to the tulips: to prove or not to prove the null
            hypothesis. Comment on Bösch, Steinkamp, and Boller (2006). <i>Psychological Bulletin</i>, 132(4), 524 to
            528.
          </li>
        </ul>
      </section>
    </main>
  );
}
