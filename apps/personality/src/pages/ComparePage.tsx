import { Link } from '../components/Link.tsx';
import { CoupleReport, ShareComparison, Similarity } from '../components/compare/CompareParts.tsx';
import { PairScale } from '../components/compare/PairScale.tsx';
import { useCompare } from '../hooks/useCompare.ts';
import { useLoaded } from '../hooks/useLoaded.ts';
import { swapTraitSides } from '../lib/big-five-view.ts';
import { swapSides, type CompareResponse } from '../lib/compare.ts';
import { loadResults } from '../lib/store.ts';
import { BigFiveCompareView } from './big-five/BigFiveCompareView.tsx';

async function loadOwnIds(): Promise<string[]> {
  return (await loadResults()).map((saved) => saved.id);
}

interface CompareViewProps {
  /** The comparison, with your own result first when one of the two is yours. */
  compare: CompareResponse;
  /** True when the first result was taken on this device. */
  own: boolean;
}

/** Two four-letter results side by side. */
function CompareView({ compare, own }: CompareViewProps) {
  const { a, b } = compare;
  const names = own ? { a: 'You', b: 'Them' } : { a: 'First', b: 'Second' };

  return (
    <main className="compare" data-state="ready" data-kind="type" data-own={own} data-unlocked={compare.unlocked}>
      <h1 className="compare-title">
        <span className="compare-kicker">Comparison</span>{' '}
        <span className="compare-types">
          <span className="compare-type">{a.type}</span> <span className="compare-and">and</span>{' '}
          <span className="compare-type">{b.type}</span>
        </span>
      </h1>

      <ul className="compare-legend">
        {(['a', 'b'] as const).map((side) => (
          <li key={side} className="compare-legend-item" data-side={side}>
            <span className="pair-marker" data-side={side} aria-hidden="true" />
            <span className="compare-legend-name">{names[side]}</span>{' '}
            <Link to={`r/${compare[side].id}`} className="compare-legend-link">
              {compare[side].type}
            </Link>
          </li>
        ))}
      </ul>

      <Similarity value={compare.similarity} scales="four scales" />

      <ul className="compare-axes">
        {compare.axes.map((axis) => (
          <li key={axis.axis} className="compare-axis" data-axis={axis.axis} data-alike={axis.alike}>
            <h2 className="compare-axis-title">
              {axis.a.left.name} and {axis.a.right.name}
            </h2>
            <p className="compare-axis-tag">{axis.alike ? 'Alike' : 'Different'}</p>
            <PairScale a={axis.aRightPct} b={axis.bRightPct} />
            <p className="compare-axis-ends" aria-hidden="true">
              <span>{axis.a.left.name}</span>
              <span>{axis.a.right.name}</span>
            </p>
            <p className="compare-axis-sides">
              <span className="compare-axis-side" data-side="a">
                {names.a}: {axis.a.headline}
              </span>{' '}
              <span className="compare-axis-side" data-side="b">
                {names.b}: {axis.b.headline}
              </span>
            </p>
          </li>
        ))}
      </ul>

      <CoupleReport
        sections={
          compare.couple?.map((section) => ({
            key: section.axis,
            heading: section.heading,
            title: section.title,
            body: section.body,
            questions: section.questions,
          })) ?? null
        }
        lead="For each of the four scales: whether the two of you are alike or different, what that tends to mean day to day, and questions to talk through together."
        back={`c/${a.id}/${b.id}`}
      />

      <ShareComparison path={`c/${a.id}/${b.id}`} title={`${a.type} and ${b.type}: two personality results compared`} />
    </main>
  );
}

export function ComparePage({ a, b }: { a: string; b: string }) {
  const { state, retry } = useCompare(a, b);
  const ownIds = useLoaded(loadOwnIds);

  if (state.status === 'notFound') {
    return (
      <main className="compare" data-state="notFound">
        <h1 className="compare-title">Comparison not found</h1>
        <p>One of these results does not exist, or the two come from different tests. A result may have been deleted.</p>
        <p>
          <Link to="" className="home-link">
            Go to the personality test
          </Link>
        </p>
      </main>
    );
  }

  if (state.status === 'error') {
    return (
      <main className="compare" data-state="error">
        <h1 className="compare-title">The comparison could not be loaded</h1>
        <p role="alert">Check your connection and try again.</p>
        <button type="button" className="compare-retry" onClick={retry}>
          Try again
        </button>
      </main>
    );
  }

  // Wait for the local lookup too, so the page does not flip between "You" and "First".
  if (state.status === 'loading' || ownIds === undefined) {
    return (
      <main className="compare" data-state="loading">
        <h1 className="compare-title">Comparison</h1>
        <p className="compare-loading">Loading the comparison.</p>
      </main>
    );
  }

  // Your own result goes first, whichever way round the link has them.
  const { compare } = state;
  const ownFirst = ownIds.includes(compare.a.id);
  const ownSecond = !ownFirst && ownIds.includes(compare.b.id);
  const own = ownFirst || ownSecond;
  if (compare.kind === 'big-five') {
    return <BigFiveCompareView compare={ownSecond ? swapTraitSides(compare) : compare} own={own} />;
  }
  return <CompareView compare={ownSecond ? swapSides(compare) : compare} own={own} />;
}
