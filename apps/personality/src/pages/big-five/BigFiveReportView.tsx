import type { CSSProperties } from 'react';
import { Link } from '../../components/Link.tsx';
import { ASPECT_BAND_LABEL, BAND_LABEL, SCALE_NOTE } from '../../lib/big-five-labels.ts';
import { displayPct } from '../../lib/big-five-test.ts';
import type { BigFiveReport } from '../../lib/big-five-view.ts';
import { paragraphs } from '../../lib/report.ts';
import { formatReportDate } from '../../lib/report-view.ts';

/** One answer moved one step changes a scale of `items` questions by this many points. */
function stepPoints(items: number): number {
  return 100 / (items * 4);
}

/** The paid Big Five report: each trait in depth with its two aspects. */
export function BigFiveReportView({ report }: { report: BigFiveReport }) {
  const perTrait = report.questionCount / report.traits.length;
  const perAspect = perTrait / 2;

  return (
    <main className="report big-five-report" data-state="ready" data-kind="big-five">
      <header className="report-cover">
        <h1 className="report-title">
          <span className="report-kicker">Full report</span> <span className="report-type">Big Five</span>
        </h1>
        <div className="report-cover-side">
          <ul className="big-five-readout">
            {report.traits.map((trait) => (
              <li key={trait.trait} className="big-five-readout-cell" data-trait={trait.trait} data-band={trait.band}>
                <span className="big-five-readout-pct">{displayPct(trait.pct)}</span>{' '}
                <span className="big-five-readout-name">{trait.name}</span>
              </li>
            ))}
          </ul>
          <dl className="report-meta">
            <div className="report-meta-item">
              <dt>Taken</dt>
              <dd>{formatReportDate(report.createdAt)}</dd>
            </div>
            <div className="report-meta-item">
              <dt>Questions</dt>
              <dd>{report.questionCount}</dd>
            </div>
            <div className="report-meta-item">
              <dt>Result</dt>
              <dd className="report-meta-id">{report.id}</dd>
            </div>
          </dl>
        </div>
      </header>

      <div className="report-layout">
        <nav className="report-contents-nav" aria-label="Contents">
          <p className="report-contents-label">Contents</p>
          <ol className="report-toc">
            {report.traits.map((trait, position) => (
              <li key={trait.trait}>
                <a className="report-toc-link" href={`#trait-${trait.trait}`}>
                  <span className="report-toc-number">{String(position + 1).padStart(2, '0')}</span> {trait.name}
                </a>
              </li>
            ))}
            <li>
              <a className="report-toc-link" href="#method">
                <span className="report-toc-number">{String(report.traits.length + 1).padStart(2, '0')}</span> How this was
                measured
              </a>
            </li>
          </ol>
        </nav>

        <div className="report-body">
          <p className="report-part-lead">{SCALE_NOTE}</p>

          {report.traits.map((trait, position) => (
            <section
              key={trait.trait}
              className="report-part big-five-trait"
              id={`trait-${trait.trait}`}
              data-trait={trait.trait}
              data-band={trait.band}
            >
              <h2 className="report-part-title">
                <span className="report-part-number">{String(position + 1).padStart(2, '0')}</span> {trait.name}
              </h2>
              <p className="big-five-trait-score">
                <span className="big-five-trait-pct">{displayPct(trait.pct)}</span>{' '}
                <span className="big-five-trait-band">{BAND_LABEL[trait.band]}</span>
              </p>
              <div className="b5-trait-scale" style={{ '--pct': displayPct(trait.pct), '--step': 1 } as CSSProperties} aria-hidden="true">
                <span className="b5-trait-fill" />
                <span className="b5-trait-marker" />
              </div>
              <p className="big-five-trait-measures">{trait.measures}</p>
              <div className="report-block">
                <h3 className="report-block-title">Your result</h3>
                {paragraphs(trait.depth).map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
              <div className="big-five-aspects">
                {trait.aspects.map((aspect) => (
                  <article key={aspect.aspect} className="big-five-aspect" data-aspect={aspect.aspect} data-band={aspect.band}>
                    <h3 className="big-five-aspect-title">
                      <span className="big-five-aspect-name">{aspect.name}</span>{' '}
                      <span className="big-five-aspect-pct">{displayPct(aspect.pct)}</span>
                    </h3>
                    <div
                      className="b5-trait-scale"
                      style={{ '--pct': displayPct(aspect.pct), '--step': 1 } as CSSProperties}
                      aria-hidden="true"
                    >
                      <span className="b5-trait-fill" />
                      <span className="b5-trait-marker" />
                    </div>
                    <p className="big-five-aspect-band">{ASPECT_BAND_LABEL[aspect.band]}</p>
                    <p className="big-five-aspect-measures">{aspect.measures}</p>
                    <p className="big-five-aspect-text">{aspect.text}</p>
                  </article>
                ))}
              </div>
            </section>
          ))}

          <section className="report-part report-method" id="method">
            <h2 className="report-part-title">
              <span className="report-part-number">{String(report.traits.length + 1).padStart(2, '0')}</span> How this was
              measured
            </h2>
            <dl className="report-facts">
              <div className="report-fact">
                <dt>Questions</dt>
                <dd>{report.questionCount}</dd>
              </div>
              <div className="report-fact">
                <dt>Per trait</dt>
                <dd>{perTrait}</dd>
              </div>
              <div className="report-fact">
                <dt>Per aspect</dt>
                <dd>{perAspect}</dd>
              </div>
            </dl>
            <p className="report-part-note">
              The questions are the Big Five Aspect Scales (DeYoung, Quilty and Peterson, 2007). Each trait has {perTrait}{' '}
              questions, split into two aspects of {perAspect}. Change one answer by one step and a trait moves by{' '}
              {stepPoints(perTrait)} points, an aspect by {stepPoints(perAspect)}. Scores between 40 and 60 count as near the
              middle.
            </p>
          </section>

          <div className="report-actions">
            <button type="button" className="report-print" onClick={() => window.print()}>
              Print or save as PDF
            </button>
            <p className="report-back">
              <Link to={`r/${report.id}`} className="report-back-link">
                Back to the result
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
