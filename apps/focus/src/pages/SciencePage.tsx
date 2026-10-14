import { useEffect } from 'react';
import { Link } from '../components/Link';
import { presets, type Preset } from '../lib/presets';
import { SAFETY_LINE } from '../lib/player-view';
import { MAX_VISUAL_HZ } from '../orbit/motion';
import '../styles/page.css';

const META_ANALYSIS_URL = 'https://doi.org/10.1007/s00426-018-1066-8';
const EEG_REVIEW_URL = 'https://doi.org/10.1371/journal.pone.0286023';

/** Plain meaning of each evidence label. */
const LABELS: { label: string; text: string }[] = [
  { label: 'Some research', text: 'Several studies point the same way.' },
  { label: 'Mixed results', text: 'Studies found different things, some for and some against.' },
  { label: 'Little research', text: 'Few studies, or none that tested this beat rate for this use.' },
];

/** Scrolls to #preset when the page opens from an evidence label. */
function useScrollToHash() {
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (id) document.getElementById(id)?.scrollIntoView();
    else window.scrollTo(0, 0);
  }, []);
}

function PresetEvidence({ preset }: { preset: Preset }) {
  const right = preset.carrier + preset.beat;
  return (
    <section className="evidence" id={preset.id} aria-labelledby={`${preset.id}-title`}>
      <h3 className="evidence-title" id={`${preset.id}-title`}>
        {preset.name} <span className="evidence-hz">{preset.beat} Hz</span>
      </h3>
      <p className="evidence-meta">
        {preset.evidence && <span className="label">{preset.evidence}</span>}
        <span>
          Left ear {preset.carrier} Hz, right ear {right} Hz.
        </span>
      </p>
      <p>{preset.wording}</p>
      {preset.evidenceNote && <p>{preset.evidenceNote}</p>}
      <ul className="sources">
        {preset.sources.map((source) => (
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
  const focus = presets.find((preset) => preset.id === 'focus');

  return (
    <main className="page">
      <p>
        <Link to="" className="page-back">
          Back to the player
        </Link>
      </p>
      <h1 className="page-title">The science</h1>

      <section className="page-section">
        <h2>How it works</h2>
        <p>
          Each ear gets its own tone.
          {focus &&
            ` In ${focus.name}, your left ear hears ${focus.carrier} Hz and your right ear hears ${focus.carrier + focus.beat} Hz.`}{' '}
          Your brain hears the difference between them as a slow pulse. This pulse is called a binaural beat.
        </p>
        <p>
          The beat only happens when each ear gets its own tone, so you need headphones. Through speakers the two
          tones mix in the air before they reach you, and it is no longer a binaural beat.
        </p>
        <p>The tones are made live in your browser. There are no audio files.</p>
      </section>

      <section className="page-section">
        <h2>What the research found</h2>
        <p>
          A 2019 meta-analysis of 22 studies (
          <a href={META_ANALYSIS_URL} rel="noreferrer" target="_blank">
            Garcia-Argibay, Santed and Reales, Psychological Research
          </a>
          ) found a medium effect (g = 0.45) on memory, attention, anxiety and pain perception. Listening before a task
          worked better than during it, and longer exposure worked better. Results vary a lot between studies, and the
          idea that a beat makes your brain match its frequency is not well supported.
        </p>
        <p>
          A medium effect of g = 0.45 means that, on average, a person who listened scored better than about 67% of
          people who did not. It is an average across very different studies, not a promise for you.
        </p>
        <p>
          On the brain matching the beat: a{' '}
          <a href={EEG_REVIEW_URL} rel="noreferrer" target="_blank">
            2023 review of 14 brain-recording studies
          </a>{' '}
          (Ingendoh, Posny and Heine, PLOS ONE) found 5 that supported it, 8 that contradicted it and 1 with mixed
          results.
        </p>
        <p>
          This is why Focus has Prime mode: a session you listen to right before you start work, because listening
          before a task worked better in these studies.
        </p>
      </section>

      <section className="page-section">
        <h2>Evidence for each preset</h2>
        <p>
          Studies have tested many beat rates, lengths and tasks, and few match a preset exactly. Each label is our
          reading of the closest studies we found.
        </p>
        <dl className="labels">
          {LABELS.map((item) => (
            <div key={item.label} className="labels-row">
              <dt>
                <span className="label">{item.label}</span>
              </dt>
              <dd>{item.text}</dd>
            </div>
          ))}
        </dl>
        {presets.map((preset) => (
          <PresetEvidence key={preset.id} preset={preset} />
        ))}
      </section>

      <section className="page-section">
        <h2>Safety</h2>
        <p className="page-strong">{SAFETY_LINE}</p>
        <p>Keep the volume low. The tones should be easy to hear, never loud.</p>
        <p>
          The orbit on screen never flashes or pulses at the beat rate. It turns at most {MAX_VISUAL_HZ} times per
          second for every preset, and it slows almost to a stop if your device is set to reduce motion.
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
