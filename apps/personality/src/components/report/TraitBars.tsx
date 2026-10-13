import type { CSSProperties } from 'react';
import type { TraitScore } from '../../lib/big-five.ts';

/** The four scores read as Big Five traits, each on a bar from low to high. */
export function TraitBars({ traits }: { traits: readonly TraitScore[] }) {
  return (
    <div className="traits">
      <p className="traits-ends" aria-hidden="true">
        <span>Low</span>
        <span>High</span>
      </p>
      <ul className="traits-list">
        {traits.map((trait) => {
          const pct = Math.round(trait.pct);
          return (
            <li
              key={trait.axis}
              className="trait"
              data-axis={trait.axis}
              style={{ '--pct': trait.pct } as CSSProperties}
            >
              <span className="trait-name">{trait.trait}</span>{' '}
              <span className="trait-pct">{pct}%</span>
              <span className="trait-bar" aria-hidden="true">
                <span className="trait-fill" />
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
