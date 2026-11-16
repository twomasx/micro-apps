import { CoupleReport, ShareComparison, Similarity } from '../../components/compare/CompareParts.tsx';
import { PairScale } from '../../components/compare/PairScale.tsx';
import { Link } from '../../components/Link.tsx';
import { displayPct } from '../../lib/big-five-test.ts';
import type { BigFiveCompareResponse } from '../../lib/big-five-view.ts';

/** Two Big Five results side by side, trait by trait. */
export function BigFiveCompareView({ compare, own }: { compare: BigFiveCompareResponse; own: boolean }) {
  const { a, b } = compare;
  const names = own ? { a: 'You', b: 'Them' } : { a: 'First', b: 'Second' };

  return (
    <main className="compare big-five-compare" data-state="ready" data-kind="big-five" data-own={own} data-unlocked={compare.unlocked}>
      <h1 className="compare-title">
        <span className="compare-kicker">Comparison</span> <span className="compare-types">Two Big Five results</span>
      </h1>

      <ul className="compare-legend">
        {(['a', 'b'] as const).map((side) => (
          <li key={side} className="compare-legend-item" data-side={side}>
            <span className="pair-marker" data-side={side} aria-hidden="true" />
            <span className="compare-legend-name">{names[side]}</span>{' '}
            <Link to={`r/${compare[side].id}`} className="compare-legend-link">
              See the result
            </Link>
          </li>
        ))}
      </ul>

      <Similarity value={compare.similarity} scales="five traits" />

      <ul className="compare-axes">
        {compare.traits.map((pair) => (
          <li key={pair.trait} className="compare-axis" data-trait={pair.trait} data-alike={pair.alike}>
            <h2 className="compare-axis-title">{pair.name}</h2>
            <p className="compare-axis-tag">{pair.alike ? 'Alike' : 'Different'}</p>
            <PairScale a={pair.a} b={pair.b} />
            <p className="compare-axis-ends" aria-hidden="true">
              <span>0</span>
              <span>100</span>
            </p>
            <p className="compare-axis-sides">
              <span className="compare-axis-side" data-side="a">
                {names.a}: {displayPct(pair.a)}
              </span>{' '}
              <span className="compare-axis-side" data-side="b">
                {names.b}: {displayPct(pair.b)}
              </span>
            </p>
          </li>
        ))}
      </ul>

      <CoupleReport
        sections={
          compare.couple?.map((section) => ({
            key: section.trait,
            heading: section.heading,
            title: section.title,
            body: section.body,
            questions: section.questions,
          })) ?? null
        }
        lead="For each of the five traits: whether the two of you are alike or different, what that tends to mean day to day, and questions to talk through together."
        back={`c/${a.id}/${b.id}`}
      />

      <ShareComparison path={`c/${a.id}/${b.id}`} title="Two Big Five results compared" />
    </main>
  );
}
