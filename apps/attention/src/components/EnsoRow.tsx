import { clock } from '../lib/format';
import type { StretchRecord } from '../lib/records';
import { seedFor } from '../ink/seed';
import { EnsoCanvas } from './EnsoCanvas';

interface EnsoRowProps {
  sessionId: string;
  stretches: readonly StretchRecord[];
  /** Fade the newest drifted circle as it is added (during a session). */
  live?: boolean;
  className?: string;
}

/** One small circle per stretch: ink when held, gray when drifted. */
export function EnsoRow({ sessionId, stretches, live = false, className = 'enso-row' }: EnsoRowProps) {
  return (
    <ol className={className} data-count={stretches.length}>
      {stretches.map((stretch, index) => (
        <li key={index} className="enso-row-item" data-stayed={stretch.stayed}>
          <EnsoCanvas
            className="enso-thumb"
            seed={seedFor(sessionId, index)}
            progress={1}
            drifted={!stretch.stayed}
            animateFade={live && index === stretches.length - 1}
            label={`Stretch ${index + 1}, ${clock(stretch.seconds)}, ${stretch.stayed ? 'stayed' : 'drifted'}`}
          />
        </li>
      ))}
    </ol>
  );
}
