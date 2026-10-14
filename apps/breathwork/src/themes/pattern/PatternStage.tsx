import { useEffect, useRef } from 'react';
import type { StageProps } from '../types';
import { PatternRenderer } from './renderer';
import './pattern.css';

/** The Pattern theme's stage: an SVG skeleton the renderer draws into. */
export function PatternStage({ controller, moment, reducedMotion }: StageProps) {
  const svg = useRef<SVGSVGElement>(null);
  const fill = useRef<SVGPathElement>(null);
  const track = useRef<SVGPathElement>(null);
  const done = useRef<SVGPathElement>(null);
  const labels = useRef<SVGGElement>(null);
  const halo = useRef<SVGCircleElement>(null);
  const dot = useRef<SVGCircleElement>(null);
  const renderer = useRef<PatternRenderer | null>(null);

  useEffect(() => {
    const els = {
      svg: svg.current!,
      fill: fill.current!,
      track: track.current!,
      done: done.current!,
      labels: labels.current!,
      halo: halo.current!,
      dot: dot.current!,
    };
    const r = new PatternRenderer(els, reducedMotion);
    renderer.current = r;
    r.draw(controller.frame());
    const unsubscribe = controller.onFrame((frame) => r.draw(frame));
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      r.resize(Math.min(width, height) / 100);
    });
    observer.observe(els.svg);
    return () => {
      unsubscribe();
      observer.disconnect();
      r.destroy();
      renderer.current = null;
    };
    // The renderer lives as long as the controller; motion and moment changes are passed in below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controller]);

  useEffect(() => {
    renderer.current?.setReducedMotion(reducedMotion);
  }, [reducedMotion]);

  useEffect(() => {
    renderer.current?.setMoment(moment);
  }, [moment]);

  return (
    <svg ref={svg} className="pattern" viewBox="0 0 100 100" data-moment="live" aria-hidden="true" focusable="false">
      <path ref={fill} className="pattern-fill" />
      <path ref={track} className="pattern-track" />
      <path ref={done} className="pattern-done" />
      <g ref={labels} className="pattern-labels" />
      <circle ref={halo} className="pattern-halo" r="0" />
      <circle ref={dot} className="pattern-dot" r="0" />
    </svg>
  );
}
