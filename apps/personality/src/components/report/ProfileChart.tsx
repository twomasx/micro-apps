import type { CSSProperties } from 'react';
import type { ReportAxis } from '../../lib/report.ts';
import { BALANCED_HALF_WIDTH, profilePoints } from '../../lib/report-view.ts';

/** All four scales on one panel, with a line joining the four markers. */
export function ProfileChart({ axes }: { axes: readonly ReportAxis[] }) {
  const label = `Profile: ${axes.map((axis) => axis.headline).join(', ')}.`;
  return (
    <figure className="profile">
      <div
        className="profile-chart"
        role="img"
        aria-label={label}
        style={{ '--rows': axes.length } as CSSProperties}
      >
        <svg
          className="profile-overlay"
          viewBox={`0 0 100 ${axes.length}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <rect
            className="profile-band"
            x={50 - BALANCED_HALF_WIDTH}
            y="0"
            width={BALANCED_HALF_WIDTH * 2}
            height={axes.length}
          />
          <line className="profile-middle" x1="50" y1="0" x2="50" y2={axes.length} />
          <polyline className="profile-line" points={profilePoints(axes)} />
        </svg>
        {axes.map((axis, position) => (
          <div
            key={axis.axis}
            className="profile-row"
            data-axis={axis.axis}
            data-winner={axis.left.winner ? 'left' : 'right'}
            style={{ '--pos': axis.rightPct, '--row': position + 1 } as CSSProperties}
          >
            <span className="profile-side" data-winner={axis.left.winner}>
              <span className="profile-letter">{axis.left.letter}</span>
              <span className="profile-pct">{axis.left.pct}</span>
            </span>
            <span className="profile-track">
              <span className="profile-marker" />
            </span>
            <span className="profile-side" data-winner={axis.right.winner}>
              <span className="profile-pct">{axis.right.pct}</span>
              <span className="profile-letter">{axis.right.letter}</span>
            </span>
          </div>
        ))}
      </div>
      <figcaption className="profile-caption">
        The shaded band is the balanced zone, {50 - BALANCED_HALF_WIDTH}% to{' '}
        {50 + BALANCED_HALF_WIDTH}%. A marker inside it means the letter could change on a retest.
      </figcaption>
    </figure>
  );
}
