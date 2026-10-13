import { useState } from 'react';
import { Link } from '../components/Link.tsx';
import { ProfileChart } from '../components/report/ProfileChart.tsx';
import { ScaleRuler } from '../components/report/ScaleRuler.tsx';
import { TraitBars } from '../components/report/TraitBars.tsx';
import { useReport } from '../hooks/useReport.ts';
import { startCheckout, type PublicResult } from '../lib/api.ts';
import { leaveTo } from '../lib/navigation.ts';
import { getProduct, priceLine } from '../lib/products.ts';
import { paragraphs, type Report, type ReportBlock } from '../lib/report.ts';
import { formatReportDate, reportParts, stepSize, type ReportPart } from '../lib/report-view.ts';

const CONTENTS = [
  'What each of the four percentages means, including what it means to be near the middle.',
  'The type in depth: strengths, blind spots, at work, under stress and how others may read you.',
  'The scores described as the four Big Five traits they measure.',
];

function Prose({ block, level }: { block: ReportBlock; level: 'h3' | 'h4' }) {
  const Heading = level;
  return (
    <div className="report-block">
      <Heading className="report-block-title">{block.heading}</Heading>
      {paragraphs(block.body).map((paragraph, position) => (
        <p key={position}>{paragraph}</p>
      ))}
    </div>
  );
}

function BackLink({ id }: { id: string }) {
  return (
    <p className="report-back">
      <Link to={`r/${id}`} className="report-back-link">
        Back to the result
      </Link>
    </p>
  );
}

function PartHeading({ part }: { part: ReportPart }) {
  return (
    <h2 className="report-part-title">
      <span className="report-part-number">{part.number}</span> {part.title}
    </h2>
  );
}

function ReportView({ report }: { report: Report }) {
  const parts = reportParts(report.type);
  const [profile, scales, traits, depth, method] = parts;
  const itemCount = report.axes[0]?.itemCount ?? 0;
  if (!profile || !scales || !traits || !depth || !method) return null;

  return (
    <main className="report" data-state="ready" data-type={report.type}>
      <header className="report-cover">
        <h1 className="report-title">
          <span className="report-kicker">Full report</span>{' '}
          <span className="report-type">{report.type}</span>
        </h1>
        <div className="report-cover-side">
          <ul className="report-readout">
            {report.axes.map((axis) => {
              const winner = axis.left.winner ? axis.left : axis.right;
              return (
                <li key={axis.axis} className="report-readout-cell" data-axis={axis.axis}>
                  <span className="report-readout-letter" aria-hidden="true">
                    {winner.letter}
                  </span>
                  <span className="report-readout-pct">{winner.pct}%</span>{' '}
                  <span className="report-readout-name">{winner.name}</span>
                </li>
              );
            })}
          </ul>
          <p className="report-summary">{report.summary}</p>
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
            {parts.map((part) => (
              <li key={part.id}>
                <a className="report-toc-link" href={`#${part.id}`}>
                  <span className="report-toc-number">{part.number}</span> {part.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="report-body">
          <section className="report-part" id={profile.id}>
            <PartHeading part={profile} />
            <ProfileChart axes={report.axes} />
          </section>

          <section className="report-part report-axes" id={scales.id}>
            <PartHeading part={scales} />
            {report.axes.map((axis) => (
              <article
                key={axis.axis}
                className="report-axis"
                data-axis={axis.axis}
                data-balanced={axis.balanceLabel !== null}
              >
                <h3 className="report-axis-headline">{axis.headline}</h3>
                <p className="report-axis-name">
                  {axis.title}
                  {axis.balanceLabel && (
                    <span className="report-axis-balance"> ({axis.balanceLabel})</span>
                  )}
                </p>
                <ScaleRuler axis={axis} />
                <div className="report-axis-blocks">
                  {axis.blocks.map((block) => (
                    <Prose key={block.heading} block={block} level="h4" />
                  ))}
                </div>
              </article>
            ))}
          </section>

          <section className="report-part" id={traits.id}>
            <PartHeading part={traits} />
            <p className="report-part-lead">
              The same four scores, read as the Big Five traits the questions were written for.
            </p>
            <TraitBars traits={report.traits} />
            <p className="report-part-note">
              Each number shows how far the answers went toward the high end of the trait. It does
              not compare this result with other people. The fifth trait, Neuroticism, is not
              measured by this test.
            </p>
          </section>

          <section className="report-part report-depth" id={depth.id}>
            <PartHeading part={depth} />
            <div className="report-depth-grid">
              {report.sections.map((block) => (
                <Prose key={block.heading} block={block} level="h3" />
              ))}
            </div>
          </section>

          <section className="report-part report-method" id={method.id}>
            <PartHeading part={method} />
            <dl className="report-facts">
              <div className="report-fact">
                <dt>Questions</dt>
                <dd>{report.questionCount}</dd>
              </div>
              <div className="report-fact">
                <dt>Per scale</dt>
                <dd>{itemCount}</dd>
              </div>
              <div className="report-fact">
                <dt>One answer moves a scale</dt>
                <dd>{stepSize(itemCount)} points</dd>
              </div>
            </dl>
            <p className="report-part-note">
              Each scale has {itemCount} questions, half toward each side. A percentage shows how far
              the answers went toward one side. Change one answer by one step and that scale moves
              by {stepSize(itemCount)} points, so a score near 50% can land on either letter.
            </p>
          </section>

          <div className="report-actions">
            <button type="button" className="report-print" onClick={() => window.print()}>
              Print or save as PDF
            </button>
            <BackLink id={report.id} />
          </div>
        </div>
      </div>
    </main>
  );
}

interface OfferProps {
  result: PublicResult;
  unconfirmed: boolean;
  onCheckAgain: () => void;
}

function Offer({ result, unconfirmed, onCheckAgain }: OfferProps) {
  const [starting, setStarting] = useState(false);
  const [failed, setFailed] = useState(false);

  const unlock = async () => {
    setStarting(true);
    setFailed(false);
    try {
      leaveTo(await startCheckout('report', result.id));
    } catch {
      setStarting(false);
      setFailed(true);
    }
  };

  return (
    <main className="report" data-state="locked" data-type={result.type}>
      <h1 className="report-title">
        <span className="report-kicker">Full report</span>{' '}
        <span className="report-type">{result.type}</span>
      </h1>
      <p className="report-lead">
        A longer read about this result, written for its four percentages and its type.
      </p>
      <ul className="report-contents">
        {CONTENTS.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>

      {unconfirmed && (
        <div className="report-unconfirmed" role="status">
          <p>We could not confirm a payment yet. If you paid, wait a few seconds and check again.</p>
          <button type="button" className="report-check" onClick={onCheckAgain}>
            Check again
          </button>
        </div>
      )}

      <section className="report-buy">
        <button
          type="button"
          className="report-unlock"
          onClick={() => void unlock()}
          disabled={starting}
        >
          Unlock the full report
        </button>
        <p className="report-price">{priceLine(getProduct('report'))}</p>
        <p className="report-note">
          You pay on Stripe. Once it is unlocked, anyone who has the link to this result can read
          the report.
        </p>
        {failed && (
          <p className="report-error" role="alert">
            Checkout could not be started. Try again.
          </p>
        )}
      </section>

      <BackLink id={result.id} />
    </main>
  );
}

export function ReportPage({ id, sessionId }: { id: string; sessionId: string | null }) {
  const { state, retry } = useReport(id, sessionId);

  switch (state.status) {
    case 'loading':
      return (
        <main className="report" data-state="loading">
          <h1 className="report-title">Full report</h1>
          <p className="report-loading">Loading the report.</p>
        </main>
      );
    case 'notFound':
      return (
        <main className="report" data-state="notFound">
          <h1 className="report-title">Result not found</h1>
          <p>This result does not exist. It may have been deleted.</p>
          <p>
            <Link to="" className="home-link">
            Go to the personality test
          </Link>
          </p>
        </main>
      );
    case 'error':
      return (
        <main className="report" data-state="error">
          <h1 className="report-title">The report could not be loaded</h1>
          <p role="alert">Check your connection and try again.</p>
          <button type="button" className="report-retry" onClick={retry}>
            Try again
          </button>
        </main>
      );
    case 'locked':
      return <Offer result={state.result} unconfirmed={state.unconfirmed} onCheckAgain={retry} />;
    case 'ready':
      return <ReportView report={state.report} />;
  }
}
