import type { CSSProperties } from 'react';
import type { ReportAxis } from '../../lib/report.ts';
import { BALANCED_HALF_WIDTH, rulerTicks } from '../../lib/report-view.ts';

/** One scale drawn as a ruler: a tick for every position the score can land on. */
export function ScaleRuler({ axis }: { axis: ReportAxis }) {
  return (
    <div
      className="ruler"
      data-winner={axis.left.winner ? 'left' : 'right'}
      style={{ '--pos': axis.rightPct, '--band': BALANCED_HALF_WIDTH } as CSSProperties}
    >
      <div className="ruler-scale" aria-hidden="true">
        <span className="ruler-band" />
        {rulerTicks(axis.itemCount).map((tick) => (
          <span
            key={tick.pct}
            className="ruler-tick"
            data-size={tick.size}
            style={{ '--t': tick.pct } as CSSProperties}
          />
        ))}
        <span className="ruler-fill" />
        <span className="ruler-marker" />
      </div>
      <p className="ruler-sides">
        {[axis.left, axis.right].map((side) => (
          <span key={side.letter} className="ruler-side" data-winner={side.winner}>
            <span className="ruler-side-letter">{side.letter}</span>{' '}
            <span className="ruler-side-name">{side.name}</span>{' '}
            <span className="ruler-side-pct">{side.pct}%</span>{' '}
          </span>
        ))}
      </p>
    </div>
  );
}
