import { useMemo } from 'react';
import { buildShape, pointAt, secondsLabel, type Shape } from '../lib/shape';
import type { Phase } from '../lib/techniques';

const PAD = 16;
const SPAN = 100 - PAD * 2;
const map = (v: number) => PAD + v * SPAN;

function shapePath(shape: Shape): string {
  return (
    shape.sides
      .flatMap((side, i) => (i === 0 ? side.points : side.points.slice(1)))
      .map((pt, i) => `${i === 0 ? 'M' : 'L'}${map(pt.x).toFixed(2)} ${map(pt.y).toFixed(2)}`)
      .join('') + 'Z'
  );
}

/** A still, labelled drawing of a pattern's shape, in the Pattern look. Redrawn as the numbers change. */
export function ShapePreview({ phases, label }: { phases: readonly Pick<Phase, 'kind' | 'ms'>[]; label: string }) {
  const shape = useMemo(() => buildShape(phases), [phases]);
  const start = pointAt(shape, 0, 0);
  return (
    <svg className="shape-preview" viewBox="0 0 100 100" role="img" aria-label={label}>
      <path className="shape-preview-line" d={shapePath(shape)} />
      {shape.sides.map((side, i) => {
        const gap = 5.5;
        const x = map(side.middle.x) + side.outward.x * gap;
        const y = map(side.middle.y) + side.outward.y * gap;
        return (
          <text
            key={i}
            className="shape-preview-label"
            x={x.toFixed(2)}
            y={y.toFixed(2)}
            textAnchor={side.outward.x > 0.45 ? 'start' : side.outward.x < -0.45 ? 'end' : 'middle'}
            dominantBaseline={side.outward.y > 0.45 ? 'hanging' : side.outward.y < -0.45 ? 'auto' : 'central'}
          >
            {secondsLabel(side.ms)}
          </text>
        );
      })}
      <circle className="shape-preview-dot" cx={map(start.x).toFixed(2)} cy={map(start.y).toFixed(2)} r="2.6" />
    </svg>
  );
}
