import { Link } from '../components/Link';
import { CV_BEST, CV_WORST, SART_VERSION, SCORE_WEIGHTS } from '../lib/sart-score';
import { REPEATS } from '../lib/sart-sequence';
import { STAIRCASE } from '../lib/staircase';

const MEDITRAIN = 'https://doi.org/10.1038/s41562-019-0611-9';
const SART = 'https://doi.org/10.1016/S0028-3932(97)00015-8';

export function SciencePage() {
  return (
    <main className="screen page science">
      <p>
        <Link to="" className="page-back">
          Back to today
        </Link>
      </p>
      <header>
        <h1 className="title">The science</h1>
        <p className="lead">What the research found, at the strength it found it.</p>
      </header>

      <section className="page-section" id="study" aria-labelledby="study-title">
        <h2 id="study-title">The study behind the training</h2>
        <p className="page-strong">
          In a controlled study, 6 weeks of training like this improved sustained attention and working memory in
          adults aged 18 to 35.
        </p>
        <p>
          The training follows MediTrain, an app tested at the University of California, San Francisco (
          <a href={MEDITRAIN} rel="noreferrer" target="_blank">
            Ziegler, Gazzaley and others, 2019
          </a>
          ).
        </p>
        <ul className="page-list">
          <li>
            59 adults aged 18 to 35 who had not meditated before were split at random between MediTrain and placebo apps.
            The placebo apps were picked because people expected the same benefits from them. Neither the participants
            nor the researchers scoring the tests knew who had which.
          </li>
          <li>Both groups used their app 5 days a week for 6 weeks: 20 minutes a day at first, 30 minutes a day by the end.</li>
          <li>
            The main measure was how much reaction times varied on a long, dull attention test, the TOVA. Steadier times
            mean fewer lapses. In the MediTrain group the variation dropped from 58.2 ms to 50.5 ms on average. The
            placebo group showed no clear change. The difference between the groups was medium-sized (Cohen's d 0.66). If the
            training did nothing, a difference this large would turn up by chance about 1 time in 60 (P = 0.016).
          </li>
          <li>
            Working memory also improved compared with placebo (Cohen's d 0.66). By chance alone, about 1 time in 25
            (P = 0.04).
          </li>
          <li>Brain recordings (EEG) showed matching changes in signals linked to attention.</li>
          <li>In the app, focus stretches grew from about 20 seconds on day 1 to about 6 minutes after 25 days.</li>
        </ul>
        <p>
          This is one study with a small group: 22 people in the MediTrain group and 18 in the placebo group were
          analysed on the main measure. The results are promising, not settled. We can't promise you the same result.
          The attention test in this app lets you measure your own.
        </p>
      </section>

      <section className="page-section" id="training" aria-labelledby="training-title">
        <h2 id="training-title">How the training adapts</h2>
        <ul className="page-list">
          <li>A low tok starts each stretch and a bell ends it. You say whether you stayed with your breath the whole time.</li>
          <li>
            "I stayed" makes the next stretch {Math.round(STAIRCASE.upFraction * 100)}% longer (at least{' '}
            {STAIRCASE.minStepUpSeconds} second). "I drifted" makes it {Math.round(STAIRCASE.downFraction * 100)}% shorter.
            These are the study's numbers.
          </li>
          <li>The first stretch is {STAIRCASE.firstSeconds} seconds, as in the study. Each session starts where the last one ended.</li>
          <li>
            Our own limits, not from the study: never under {STAIRCASE.minSeconds} seconds or over{' '}
            {STAIRCASE.maxSeconds / 60} minutes.
          </li>
          <li>
            A session counts focus time only, not the pauses. You choose 10, 15 or 20 minutes, or the study schedule: 20
            minutes a day in weeks 1 and 2, 25 in weeks 3 and 4, 30 in weeks 5 and 6. The study counted all the time spent
            in the app, pauses included.
          </li>
          <li>
            30 practice days, as in the study (5 a week for 6 weeks). The day count only moves on days you practice.
          </li>
        </ul>
        <p>The study did not test shorter days than 20 minutes. Shorter sessions may do less.</p>
      </section>

      <section className="page-section" id="test" aria-labelledby="test-title">
        <h2 id="test-title">The attention test</h2>
        <p>
          The test is the Sustained Attention to Response Task, the SART (
          <a href={SART} rel="noreferrer" target="_blank">
            Robertson and others, 1997
          </a>
          ). It is a widely used test of keeping attention on a dull task.
        </p>
        <ul className="page-list">
          <li>Numbers from 1 to 9 appear one at a time, each for 250 ms, followed by a 900 ms mask. You tap for every number except 3.</li>
          <li>Each number appears equally often, in a random order, in one of five sizes.</li>
          <li>
            Quick has {REPEATS.quick * 9} numbers. Full has {REPEATS.full * 9}, the standard research length. Your first time
            starts with an 18-number practice round with feedback.
          </li>
          <li>A tap within 100 ms of a number appearing is too fast to be an answer. It is counted as an early tap.</li>
        </ul>
        <p>
          The study used a different test, the TOVA. Both measure how well you keep attention on a dull task, but they
          are not the same test. A change on one does not guarantee a change on the other.
        </p>
        <p>
          Scores usually rise a little on a second test just from practice. Compare with your first few results, not
          just the last one. Phone screens also add a small delay, so your times are best compared with your own
          earlier results. Each result keeps its own timing measurements under "Timing on this screen".
        </p>
      </section>

      <section className="page-section" id="score" aria-labelledby="score-title">
        <h2 id="score-title">How the score is calculated</h2>
        <p>The attention score runs from 0 to 100 and has three parts:</p>
        <ul className="page-list">
          <li>
            <strong>Holding back on 3s, {SCORE_WEIGHTS.holds} points:</strong> {SCORE_WEIGHTS.holds} × the share of 3s you
            did not tap.
          </li>
          <li>
            <strong>Not missing numbers, {SCORE_WEIGHTS.hits} points:</strong> {SCORE_WEIGHTS.hits} × the share of other
            numbers you tapped.
          </li>
          <li>
            <strong>Steady timing, {SCORE_WEIGHTS.steadiness} points:</strong> from the coefficient of variation (CV) of
            your reaction times on correct taps, which is the standard deviation divided by the average. A CV of{' '}
            {CV_BEST.toFixed(2)} or lower gets all {SCORE_WEIGHTS.steadiness} points, {CV_WORST.toFixed(2)} or higher gets
            none, with a straight line between.
          </li>
        </ul>
        <p>
          The total is rounded to a whole number. For example: 1 tap on twelve 3s, 2 missed out of 96, and a CV of 0.20
          gives 50 × 11/12 + 25 × 94/96 + 25 × 0.71 = 45.8 + 24.5 + 17.9 = 88.
        </p>
        <p>
          Taps on a 3 are the SART's classic measure, so they carry half the score. Steady timing is in the score because
          the study's main result was steadier reaction times. The weights are our choice, not a research standard. They
          stay fixed, so your scores compare over time. This is score version {SART_VERSION}.
        </p>
        <p>
          Comparisons with other people ("compared with people who took it here") appear only once 200 people have
          taken their first test of that length. Only first tests count, so people who take it often don't tilt the
          numbers. Before that there is no comparison, because a small group would give a misleading number.
        </p>
      </section>

      <section className="page-section" id="experimental" aria-labelledby="experimental-title">
        <h2 id="experimental-title">What is experimental</h2>
        <ul className="page-list">
          <li>
            <strong>Tick probes.</strong> In about 1 in 4 stretches, a very quiet tick plays at a random moment. Tapping
            when you hear it suggests your attention was present. This is our addition. It has not been tested as a
            measure. It never changes your stretch length, and you can turn it off in Settings.
          </li>
          <li>
            <strong>Testing before and during training.</strong> Taking the SART before you start and once a week is our
            addition too. The study tested people only before and after the 6 weeks, with different tests.
          </li>
        </ul>
      </section>

      <section className="page-section" id="limits" aria-labelledby="limits-title">
        <h2 id="limits-title">What this is not</h2>
        <p className="page-strong">This is not a medical device or a treatment for ADHD or any condition.</p>
        <p>
          The study included healthy adults aged 18 to 35. It tells us nothing about children, older adults or anyone
          with a medical condition.
        </p>
      </section>

      <section className="page-section" id="sources" aria-labelledby="sources-title">
        <h2 id="sources-title">Sources</h2>
        <ol className="page-list sources">
          <li>
            Ziegler, D. A., Simon, A. J., Gallen, C. L., Skinner, S., Janowich, J. R., Volponi, J. J., Rolle, C. E.,
            Mishra, J., Kornfield, J., Anguera, J. A. and Gazzaley, A. (2019). Closed-loop digital meditation improves
            sustained attention in young adults. <em>Nature Human Behaviour</em>, 3, 746 to 757.{' '}
            <a href={MEDITRAIN} rel="noreferrer" target="_blank">
              doi.org/10.1038/s41562-019-0611-9
            </a>
          </li>
          <li>
            Robertson, I. H., Manly, T., Andrade, J., Baddeley, B. T. and Yiend, J. (1997). "Oops!": performance
            correlates of everyday attentional failures in traumatic brain injured and normal subjects.{' '}
            <em>Neuropsychologia</em>, 35(6), 747 to 758.{' '}
            <a href={SART} rel="noreferrer" target="_blank">
              doi.org/10.1016/S0028-3932(97)00015-8
            </a>
          </li>
        </ol>
      </section>

      <p>
        <Link to="" className="page-link">
          Back to today
        </Link>
      </p>
    </main>
  );
}
