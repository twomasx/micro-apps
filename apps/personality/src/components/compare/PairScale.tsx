import type { CSSProperties } from 'react';
import type { AxisComparison } from '../../lib/compare.ts';

/** Two results on one scale: a filled marker, a ring, and the gap between them. */
export function PairScale({ axis }: { axis: AxisComparison }) {
  const from = Math.min(axis.aRightPct, axis.bRightPct);
  return (
    <div
      className="pair-scale"
      aria-hidden="true"
      style={{ '--a': axis.aRightPct, '--b': axis.bRightPct, '--from': from, '--gap': axis.difference } as CSSProperties}
    >
      <span className="pair-gap" />
      <span className="pair-marker" data-side="a" />
      <span className="pair-marker" data-side="b" />
    </div>
  );
}
