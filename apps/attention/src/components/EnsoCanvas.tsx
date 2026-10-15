import { useEffect, useLayoutEffect, useRef } from 'react';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { drawEnso, fitCanvas } from '../ink/draw';

/** How long a drifted circle takes to fade from ink to gray. */
const FADE_MS = 1400;
/** The circle's radius as a share of half the canvas: room for the stroke and the dry splay. */
const RADIUS_SHARE = 0.84;

interface EnsoCanvasProps {
  seed: number;
  /** 0 to 1, or a function read every frame while the brush is moving. */
  progress: number | (() => number);
  drifted?: boolean;
  /** Fade a drifted circle slowly, as it happens. Off for circles drawn from history. */
  animateFade?: boolean;
  className?: string;
  label?: string;
}

/**
 * One enso on a canvas. Redraws when its box changes size. While `progress` is a function,
 * it redraws only when the brush has moved about a pixel, to spare the battery on long stretches.
 */
export function EnsoCanvas({ seed, progress, drifted = false, animateFade = false, className, label }: EnsoCanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const props = useRef({ seed, progress });
  useLayoutEffect(() => {
    props.current = { seed, progress };
  });
  const fade = useRef({ from: drifted ? 1 : 0, to: drifted ? 1 : 0, start: 0 });

  useEffect(() => {
    const f = fade.current;
    const target = drifted ? 1 : 0;
    if (f.to === target) return;
    const now = performance.now();
    f.from = animateFade && !reduced ? currentFade(f, now) : target;
    f.to = target;
    f.start = now;
  }, [drifted, animateFade, reduced]);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    let frame = 0;
    let drawn = { progress: -1, fade: -1, w: 0, h: 0 };

    const paint = () => {
      const { w, h } = fitCanvas(canvas);
      const p = props.current;
      const value = typeof p.progress === 'function' ? p.progress() : p.progress;
      const now = performance.now();
      const fadeNow = currentFade(fade.current, now);
      const radius = (Math.min(w, h) / 2) * RADIUS_SHARE;
      const minStep = 1 / (2 * Math.PI * radius);
      const moved = Math.abs(value - drawn.progress) >= minStep || (value === 1 && drawn.progress !== 1);
      if (moved || fadeNow !== drawn.fade || w !== drawn.w || h !== drawn.h) {
        ctx.clearRect(0, 0, w, h);
        drawEnso(ctx, p.seed, { cx: w / 2, cy: h / 2, radius, progress: value, fade: fadeNow });
        drawn = { progress: value, fade: fadeNow, w, h };
      }
      const fading = now - fade.current.start < FADE_MS && fade.current.from !== fade.current.to;
      if (typeof p.progress === 'function' || fading) frame = requestAnimationFrame(paint);
    };

    paint();
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      paint();
    });
    observer.observe(canvas);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [seed, progress, drifted]);

  return <canvas ref={ref} className={className} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} />;
}

function currentFade(f: { from: number; to: number; start: number }, now: number): number {
  if (f.from === f.to) return f.to;
  const k = Math.min(1, (now - f.start) / FADE_MS);
  const eased = k * k * (3 - 2 * k);
  return f.from + (f.to - f.from) * eased;
}
