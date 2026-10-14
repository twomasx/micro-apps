import { useEffect } from 'react';
import { Link } from '../components/Link';
import { MiniShape } from '../components/TechniquePicker';
import { HOW_TO_FOLLOW, LABEL_MEANINGS, patternText, SAFETY_LINE } from '../lib/content';
import { techniques, type Technique } from '../lib/techniques';
import '../styles/page.css';

const META_ANALYSIS_URL = 'https://doi.org/10.1038/s41598-022-27247-y';

/** Scrolls to #technique when the page opens from an evidence label. */
function useScrollToHash() {
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (id) document.getElementById(id)?.scrollIntoView();
  }, []);
}

function TechniqueEvidence({ technique }: { technique: Technique }) {
  const evidence = technique.evidence;
  if (!evidence) return null;
  return (
    <section className="evidence" id={technique.id} aria-labelledby={`${technique.id}-title`}>
      <div className="evidence-head">
        <MiniShape phases={technique.phases} />
        <h3 className="evidence-title" id={`${technique.id}-title`}>
          {technique.name}
        </h3>
      </div>
      <p className="evidence-meta">
        <span className="label">{evidence.label}</span>
        <span>{patternText(technique)}</span>
      </p>
      <p className="page-strong">{technique.wording}</p>
      <p>{evidence.note}</p>
      <ul className="sources">
        {evidence.sources.map((source) => (
          <li key={source.url} className="source">
            <p className="source-cite">
              <a href={source.url} rel="noreferrer" target="_blank">
                {source.authors}, {source.year}
              </a>
              <span className="source-journal">
                {source.title}. {source.journal}.
              </span>
            </p>
            <p>{source.finding}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function SciencePage() {
  useScrollToHash();

  return (
    <main className="page">
      <p>
        <Link to="" className="page-back">
          Back to breathing
        </Link>
      </p>
      <h1 className="page-title">The science</h1>

      <section className="page-section">
        <h2>How it works</h2>
        <p>
          Each technique is drawn as a shape. The dot goes around the shape once for every breath. {HOW_TO_FOLLOW}
        </p>
        <p>
          Every side is as long as its seconds, so a long breath out is a long side. When straight sides cannot close
          the shape at those lengths, the longest side curves, like the slow slide down of the cyclic sigh.
        </p>
        <p>
          A low hum marks each change: it rises as you start to breathe in, stays level for a hold, and sinks as you
          breathe out. On Android phones you also feel a short buzz. So you can follow with your eyes closed.
        </p>
      </section>

      <section className="page-section">
        <h2>What the research found</h2>
        <p>
          A 2023 meta-analysis of 12 randomized trials with 785 adults (
          <a href={META_ANALYSIS_URL} rel="noreferrer" target="_blank">
            Fincham, Strauss, Montero-Marin and Cavanagh, Scientific Reports
          </a>
          ) found that people who practiced breathwork reported less stress than people in control groups. The effect
          was small to medium (g = 0.35). Trials on anxiety (20 trials) and low mood (18 trials) found effects of a
          similar size.
        </p>
        <p>
          An effect of g = 0.35 means that, on average, a person who practiced breathwork had less stress than about
          64% of people who did not. It is an average across different techniques and studies, not a promise for you.
        </p>
        <p>
          The authors rated most of the trials at moderate risk of bias, and they warn that interest in breathwork has
          grown faster than the evidence.
        </p>
        <p>
          Most research is on slow breathing in general. Few studies compare one named pattern with another, which is
          why most of the labels below say Little research.
        </p>
      </section>

      <section className="page-section">
        <h2>Evidence for each technique</h2>
        <p>Each label is our reading of the closest studies we found.</p>
        <dl className="labels">
          {LABEL_MEANINGS.map((item) => (
            <div key={item.label} className="labels-row">
              <dt>
                <span className="label">{item.label}</span>
              </dt>
              <dd>{item.text}</dd>
            </div>
          ))}
        </dl>
        {techniques.map((technique) => (
          <TechniqueEvidence key={technique.id} technique={technique} />
        ))}
      </section>

      <section className="page-section" id="safety">
        <h2>Safety</h2>
        <p className="page-strong">{SAFETY_LINE}</p>
        <p>
          Breathe at a pace that feels easy. If a hold feels like a strain, stop and breathe normally, or try Resonant,
          which has no holds.
        </p>
        <p>
          Breathwork is not a medical treatment. If anxiety, panic or poor sleep keep getting in the way of your days,
          talk to a doctor.
        </p>
        <p>
          Nothing on screen flashes. If your device is set to reduce motion, shapes stop morphing and fading, but the
          dot still moves, because it is the guide.
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
