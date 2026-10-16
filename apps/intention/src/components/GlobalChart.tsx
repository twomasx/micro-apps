import { chartShape } from '../lib/chart.ts';
import { formatCount } from '../lib/copy.ts';

const WIDTH = 600;
const HEIGHT = 320;

interface Props {
  bits: number[];
  deviation: number[];
}

/** Everyone's running deviation toward the aim, with the bands where chance usually keeps it. */
export function GlobalChart({ bits, deviation }: Props) {
  const shape = chartShape(bits, deviation, WIDTH, HEIGHT);
  const last = deviation.at(-1) ?? 0;
  return (
    <figure className="chart">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`Running total toward the aim: ${last >= 0 ? '+' : '−'}${formatCount(Math.abs(last))} after ${formatCount(shape.xMax)} bits.`}
        preserveAspectRatio="none"
      >
        <path className="chart-band chart-band-100" d={shape.band100} />
        <path className="chart-band chart-band-20" d={shape.band20} />
        <line className="chart-zero" x1="0" x2={WIDTH} y1={shape.zeroY} y2={shape.zeroY} />
        <path className="chart-line" d={shape.line} />
      </svg>
      <div className="chart-axis" aria-hidden="true">
        <span>0</span>
        <span>{formatCount(shape.xMax)} bits</span>
      </div>
      <figcaption className="chart-key">
        <span className="chart-key-item" data-key="line">
          Running total toward the aim
        </span>
        <span className="chart-key-item" data-key="band20">
          Chance stays here 19 times in 20
        </span>
        <span className="chart-key-item" data-key="band100">
          99 times in 100
        </span>
      </figcaption>
    </figure>
  );
}
