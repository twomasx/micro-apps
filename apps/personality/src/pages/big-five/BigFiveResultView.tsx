import type { CSSProperties } from 'react';
import { Link } from '../../components/Link.tsx';
import { ResultActions } from '../../components/ResultActions.tsx';
import { revealStep, useReveal } from '../../hooks/useReveal.ts';
import { BAND_LABEL, SCALE_NOTE } from '../../lib/big-five-labels.ts';
import { displayPct } from '../../lib/big-five-test.ts';
import type { BigFiveResultResponse } from '../../lib/big-five-view.ts';
import { getProduct, priceLine } from '../../lib/products.ts';
import { SAME_ANSWERS_MESSAGE } from '../../lib/result-view.ts';
import type { SavedResult } from '../../lib/store.ts';

// The reveal: traits come in one after another, numbers count up from the middle of the scale.
const STEP_DELAY_MS = 120;
const STEP_DURATION_MS = 900;
const REVEAL_MS = STEP_DELAY_MS * 4 + STEP_DURATION_MS;

interface Props {
  result: BigFiveResultResponse;
  /** Set when this result was taken on this device. */
  own: SavedResult | undefined;
}

/** The free Big Five result: the five traits with their scores and the short text for each band. */
export function BigFiveResultView({ result, own }: Props) {
  const elapsed = useReveal(REVEAL_MS);

  return (
    <main className="result big-five-result" data-state="ready" data-own={own !== undefined} data-revealed={elapsed >= REVEAL_MS}>
      <h1 className="result-title">
        <span className="result-title-label">{own ? 'Your result' : 'This result'}</span>{' '}
        <span className="b5-result-name">Big Five</span>
      </h1>

      {result.flags.includes('same_answers') && <p className="result-warning">{SAME_ANSWERS_MESSAGE}</p>}

      <p className="big-five-note">{SCALE_NOTE}</p>

      <ul className="b5-traits">
        {result.traits.map((trait, position) => {
          const step = revealStep(elapsed, position * STEP_DELAY_MS, STEP_DURATION_MS);
          const shown = Math.round(50 + (displayPct(trait.pct) - 50) * step);
          return (
            <li
              key={trait.trait}
              className="b5-trait"
              data-trait={trait.trait}
              data-band={trait.band}
              style={{ '--pct': shown, '--step': step } as CSSProperties}
            >
              <h2 className="b5-trait-headline">
                <span className="b5-trait-name">{trait.name}</span> <span className="b5-trait-pct">{shown}</span>
              </h2>
              <div className="b5-trait-scale" aria-hidden="true">
                <span className="b5-trait-fill" />
                <span className="b5-trait-marker" />
              </div>
              <p className="b5-trait-band">{BAND_LABEL[trait.band]}</p>
              <p className="b5-trait-measures">{trait.measures}</p>
              <p className="b5-trait-summary">{trait.summary}</p>
            </li>
          );
        })}
      </ul>

      <section className="result-report" data-unlocked={result.unlocked}>
        <h2 className="result-report-title">Full Big Five report</h2>
        <p className="result-report-lead">
          Both aspects of every trait, ten in all, and a longer read on what each of your five scores means day to day.
        </p>
        <Link to={`r/${result.id}/report`} className="result-report-link">
          {result.unlocked ? 'Read the full report' : 'See the full report'}
        </Link>
        {!result.unlocked && <p className="result-report-price">{priceLine(getProduct('lifetime'))}</p>}
      </section>

      <ResultActions id={result.id} kind="big-five" own={own} shareTitle="My Big Five personality result" />
    </main>
  );
}
