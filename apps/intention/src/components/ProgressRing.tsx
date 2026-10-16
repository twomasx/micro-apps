const RADIUS = 16;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface Props {
  /** Share of the run's bits shown, 0 to 1. */
  progress: number;
  /** The run finished: the ring draws itself into a check mark. */
  complete: boolean;
}

/** A small ring that fills over the run, then becomes a check mark. No text, no timer. */
export function ProgressRing({ progress, complete }: Props) {
  const offset = CIRCUMFERENCE * (1 - Math.max(0, Math.min(1, progress)));
  return (
    <svg
      className="ring"
      viewBox="0 0 40 40"
      role="progressbar"
      aria-label="Run progress"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
      data-complete={complete}
    >
      <circle className="ring-track" cx="20" cy="20" r={RADIUS} />
      <circle
        className="ring-fill"
        cx="20"
        cy="20"
        r={RADIUS}
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={offset}
        transform="rotate(-90 20 20)"
      />
      <path className="ring-check" d="M13 20.5l4.5 4.5L27 15.5" pathLength={1} />
    </svg>
  );
}
