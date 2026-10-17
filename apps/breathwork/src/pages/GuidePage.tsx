import { Link } from '../components/Link';
import { ShapePreview } from '../components/ShapePreview';
import { patternText, SAFETY_LINE } from '../lib/content';
import { findGuide, GUIDES, guideTechnique, startPath, type Guide } from '../lib/guides';
import type { Phase, Technique } from '../lib/techniques';
import { NotFoundPage } from './NotFoundPage';
import '../styles/page.css';

const DOT_MOVES: Record<Phase['kind'], string> = {
  in: 'The dot goes up.',
  hold: 'The dot goes across.',
  out: 'The dot comes down.',
};

const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

/** "Breathe in for 4 seconds, through your nose." One line per phase, from the technique's own data. */
export function stepText(
  phase: Pick<Phase, 'kind' | 'ms' | 'hint'>,
  previous: Pick<Phase, 'kind'> | undefined,
): string {
  const amount = Math.round(phase.ms / 100) / 10;
  const seconds = `${amount} ${amount === 1 ? 'second' : 'seconds'}`;
  const hint = phase.hint ? `, ${lowerFirst(phase.hint)}` : '';
  if (phase.kind === 'in') return `Breathe in${previous?.kind === 'in' ? ' again' : ''} for ${seconds}${hint}.`;
  if (phase.kind === 'out') return `Breathe out for ${seconds}${hint}.`;
  return `Hold for ${seconds}${hint}.`;
}

/** What a visitor pays: nothing for a free technique; a locked one says it is part of the unlock (SEO.md). */
function costLine(technique: Technique): string {
  return technique.free
    ? 'Free. No sign-up. A soft tone marks each step, so you can follow with your eyes closed.'
    : 'Part of the lifetime unlock. Without it, it runs as a 1-minute preview.';
}

function Start({ guide }: { guide: Guide }) {
  return (
    <Link to={startPath(guide)} className="guide-start">
      {guide.start}
    </Link>
  );
}

function Evidence({ technique }: { technique: Technique }) {
  const evidence = technique.evidence;
  if (!evidence) return null;
  return (
    <>
      <p className="evidence-meta">
        <span className="label">{evidence.label}</span>
        <span>{patternText(technique)}</span>
      </p>
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
    </>
  );
}

/** One technique's page: the answer and the start button first, then how, when, the research and the cautions. */
export function GuidePage({ slug }: { slug: string }) {
  const guide = findGuide(slug);
  if (!guide) return <NotFoundPage />;
  const technique = guideTechnique(guide);
  const others = GUIDES.filter((other) => other.slug !== guide.slug);

  return (
    <main className="page guide" data-technique={technique.id}>
      <p>
        <Link to="" className="page-back">
          Breathing timer
        </Link>
      </p>

      <header className="guide-hero">
        <h1 className="page-title">{guide.heading}</h1>
        <p className="guide-answer">{guide.answer}</p>
        <Start guide={guide} />
        <p className="guide-cost">{costLine(technique)}</p>
        <ShapePreview
          phases={technique.phases}
          label={`The ${guide.name.toLowerCase()} shape: ${patternText(technique)}`}
        />
      </header>

      <section className="page-section" aria-labelledby="how-title">
        <h2 id="how-title">How to do {guide.name.toLowerCase()}</h2>
        <ol className="guide-steps">
          {technique.phases.map((phase, i) => (
            <li key={i}>
              <span className="page-strong">{stepText(phase, technique.phases[i - 1])}</span> {DOT_MOVES[phase.kind]}
            </li>
          ))}
        </ol>
        {guide.howTo.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </section>

      <section className="page-section" aria-labelledby="uses-title">
        <h2 id="uses-title">When people use it</h2>
        {guide.uses.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </section>

      <section className="page-section" aria-labelledby="research-title">
        <h2 id="research-title">What the research says</h2>
        <Evidence technique={technique} />
        {guide.research.map((line) => (
          <p key={line}>{line}</p>
        ))}
        <p>
          <Link to={`science#${technique.id}`} className="page-link">
            Every technique and its evidence
          </Link>
        </p>
      </section>

      <section className="page-section" aria-labelledby="careful-title">
        <h2 id="careful-title">Who should be careful</h2>
        <p className="page-strong">{SAFETY_LINE}</p>
        {guide.careful.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </section>

      <section className="page-section" aria-labelledby="questions-title">
        <h2 id="questions-title">Questions</h2>
        {guide.questions.map((item) => (
          <div key={item.question} className="guide-question">
            <h3>{item.question}</h3>
            <p>{item.answer}</p>
          </div>
        ))}
      </section>

      <section className="page-section guide-end" aria-label="Start">
        <Start guide={guide} />
        <ul className="guide-more">
          {others.map((other) => (
            <li key={other.slug}>
              <Link to={other.slug} className="page-link">
                {other.name}
              </Link>
            </li>
          ))}
          <li>
            <Link to="science" className="page-link">
              The science
            </Link>
          </li>
        </ul>
      </section>
    </main>
  );
}
