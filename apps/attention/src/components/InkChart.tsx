import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { drawInkDot, drawInkLine, fitCanvas, GRAY } from '../ink/draw';
import { chartPoints, labelAbove, labelledIndexes, nearestIndex, type ChartBox } from '../lib/chart';

interface InkChartProps {
  /** Names the series, for the table and screen readers. */
  name: string;
  values: readonly number[];
  /** One label per point, like "Day 4" or "Test 2". */
  labels: readonly string[];
  format: (value: number) => string;
  domain: [number, number];
  seed: number;
}

const HEIGHT = 168;
const PAD = { padTop: 34, padBottom: 30, padX: 18 };

/**
 * One series as a brushed ink line, with ink dots at each value. The first, highest and last
 * values are printed; tap or hover anywhere on the chart to read any other. A table view
 * sits under it.
 */
export function InkChart({ name, values, labels, format, domain, seed }: InkChartProps) {
  const plotRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const box: ChartBox = { width, height: HEIGHT, ...PAD };
  const points = width > 0 ? chartPoints(values, domain, box) : [];
  const key = values.join(',');
  const [lo, hi] = domain;

  useEffect(() => {
    const plot = plotRef.current;
    if (!plot) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry!.contentRect.width)));
    observer.observe(plot);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || width === 0) return;
    const { w, h, dpr } = fitCanvas(canvas);
    ctx.clearRect(0, 0, w, h);
    // A faint baseline, so the line has ground to stand on.
    ctx.save();
    ctx.strokeStyle = GRAY;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = dpr;
    const base = (HEIGHT - PAD.padBottom + 8) * dpr;
    ctx.beginPath();
    ctx.moveTo(0, base);
    ctx.lineTo(w, base);
    ctx.stroke();
    ctx.restore();
    const pts = chartPoints(values, [lo, hi], { width, height: HEIGHT, ...PAD });
    drawInkLine(ctx, pts, { seed, width: 3.2, dpr });
    for (const p of pts) drawInkDot(ctx, p.x, p.y, 4, dpr);
    // Redrawn only when the data or the size change, not on every pointer move.
  }, [key, lo, hi, seed, width]); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (event: PointerEvent<HTMLDivElement>) => {
    if (points.length === 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setActive(nearestIndex(points, event.clientX - rect.left));
  };

  const shown = labelledIndexes(values);
  const last = values.length - 1;

  return (
    <figure className="chart">
      <p className="chart-readout" data-state={active === null ? 'hint' : 'value'} aria-live="polite">
        {active === null ? (values.length > 1 ? 'Tap the chart to read each value.' : ' ') : `${labels[active]}: ${format(values[active]!)}`}
      </p>
      <div
        ref={plotRef}
        className="chart-plot"
        style={{ height: HEIGHT }}
        onPointerDown={pick}
        onPointerMove={pick}
        onPointerLeave={(event) => event.pointerType === 'mouse' && setActive(null)}
        aria-hidden="true"
      >
        <canvas ref={canvasRef} className="chart-canvas" />
        {points.length > 0 &&
          shown.map((i) => (
            <span
              key={i}
              className="chart-value"
              data-place={labelAbove(values, i) ? 'above' : 'below'}
              style={{ left: points[i]!.x, top: points[i]!.y }}
            >
              {format(values[i]!)}
            </span>
          ))}
        {points.length > 0 && (
          <>
            <span className="chart-x" data-edge="start" style={{ left: points[0]!.x }}>
              {labels[0]}
            </span>
            {last > 0 && (
              <span className="chart-x" data-edge="end" style={{ left: points[last]!.x }}>
                {labels[last]}
              </span>
            )}
          </>
        )}
        {active !== null && points[active] && (
          <span className="chart-marker" style={{ left: points[active]!.x, top: points[active]!.y }} />
        )}
      </div>
      <details className="chart-table">
        <summary>Show the numbers</summary>
        <table>
          <caption className="visually-hidden">{name}</caption>
          <tbody>
            {values.map((v, i) => (
              <tr key={i}>
                <th scope="row">{labels[i]}</th>
                <td>{format(v)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
