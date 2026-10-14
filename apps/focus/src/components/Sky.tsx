import { useEffect, useRef, type CSSProperties } from 'react';
import { drawStars } from '../orbit/stars';

interface SkyProps {
  /** Colour of the glow behind the orbit. */
  nebula: string;
  state: string;
}

const LAYERS = [
  { seed: 11, density: 70 },
  { seed: 29, density: 34 },
  { seed: 53, density: 34 },
];

/** The starfield. Painted once per screen size; the slow twinkle is two layers fading in CSS. */
export function Sky({ nebula, state }: SkyProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const paint = () => {
      root.querySelectorAll('canvas').forEach((canvas, index) => {
        const layer = LAYERS[index];
        if (layer) drawStars(canvas, layer.seed, layer.density);
      });
    };
    paint();
    const observer = new ResizeObserver(paint);
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="sky" ref={ref} data-state={state} style={{ '--nebula': nebula } as CSSProperties} aria-hidden="true">
      {LAYERS.map((layer, index) => (
        <canvas key={layer.seed} className="sky-stars" data-layer={index} />
      ))}
    </div>
  );
}
