import { useState } from 'react';
import { Link } from '../components/Link.tsx';
import { useReport } from '../hooks/useReport.ts';
import { startCheckout, type PublicResult } from '../lib/api.ts';
import { leaveTo } from '../lib/navigation.ts';
import { getProduct, priceLine } from '../lib/products.ts';
import { paragraphs, type Report, type ReportBlock } from '../lib/report.ts';

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

function ReportView({ report }: { report: Report }) {
  return (
    <main className="report" data-state="ready" data-type={report.type}>
      <h1 className="report-title">
        <span className="report-kicker">Full report</span>{' '}
        <span className="report-type">{report.type}</span>
      </h1>
      <p className="report-summary">{report.summary}</p>

      <section className="report-part report-axes">
        <h2 className="report-part-title">The four scales</h2>
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
              {axis.balanceLabel && <span className="report-axis-balance"> ({axis.balanceLabel})</span>}
            </p>
            {axis.blocks.map((block) => (
              <Prose key={block.heading} block={block} level="h4" />
            ))}
          </article>
        ))}
      </section>

      <section className="report-part report-depth">
        <h2 className="report-part-title">{report.type} in depth</h2>
        {report.sections.map((block) => (
          <Prose key={block.heading} block={block} level="h3" />
        ))}
      </section>

      <BackLink id={report.id} />
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
            <Link to="">Go to the personality test</Link>
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
