import { useEffect, useRef, useState } from 'react';
import { drawEnso, fitCanvas } from '../ink/draw';

export interface GridCircle {
  seed: number;
  drifted: boolean;
}

interface CircleGridProps {
  circles: readonly GridCircle[];
  /** Size of each circle and the gap between them, in CSS pixels. */
  size: number;
  gap: number;
  label: string;
  className?: string;
}

/**
 * Many small circles on one canvas: a month of practice can be well over a thousand circles,
 * too many for one canvas each. Paints only once it scrolls into view.
 */
export function CircleGrid({ circles, size, gap, label, className = 'circle-grid' }: CircleGridProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(0);
  const columns = Math.max(1, Math.floor((width + gap) / (size + gap)));
  const rows = Math.ceil(circles.length / columns);
  const height = rows * size + Math.max(0, rows - 1) * gap;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry!.contentRect.width)));
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || width === 0) return;
    const paint = () => {
      const { w, h, dpr } = fitCanvas(canvas);
      ctx.clearRect(0, 0, w, h);
      circles.forEach((circle, i) => {
        const col = i % columns;
        const row = Math.floor(i / columns);
        drawEnso(ctx, circle.seed, {
          cx: (col * (size + gap) + size / 2) * dpr,
          cy: (row * (size + gap) + size / 2) * dpr,
          radius: (size / 2) * 0.84 * dpr,
          progress: 1,
          fade: circle.drifted ? 1 : 0,
        });
      });
    };
    const seen = new IntersectionObserver(([entry]) => {
      if (entry!.isIntersecting) {
        paint();
        seen.disconnect();
      }
    });
    seen.observe(canvas);
    return () => seen.disconnect();
  }, [circles, columns, size, gap, width, height]);

  return <canvas ref={ref} className={className} style={{ height }} role="img" aria-label={label} />;
}
