import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { orbitGeometry, type OrbitGeometry } from '../orbit/motion';
import { createOrbitScene, type OrbitScene, type SceneInput } from '../orbit/scene';

interface OrbitProps extends SceneInput {
  /** Shown in the middle of the orbit: the clock. */
  children?: ReactNode;
}

/** The stage between the heading and the controls, with the orbit drawn in its centre. */
export function Orbit({ beat, status, timer, companion, children }: OrbitProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<OrbitScene | null>(null);
  const [geometry, setGeometry] = useState<OrbitGeometry>({ radius: 0, ring: 0, side: 0 });
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;
    const scene = createOrbitScene(canvas);
    sceneRef.current = scene;

    const measure = () => {
      const next = orbitGeometry(stage.clientWidth, stage.clientHeight);
      scene.setGeometry(next);
      setGeometry(next);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(stage);

    // Animation stops while the page is hidden. The audio does not.
    const onVisibility = () => (document.hidden ? scene.stop() : scene.start());
    document.addEventListener('visibilitychange', onVisibility);
    onVisibility();

    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      scene.stop();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    sceneRef.current?.setReducedMotion(reducedMotion);
  }, [reducedMotion]);

  useEffect(() => {
    sceneRef.current?.setInput({ beat, status, timer, companion });
  }, [beat, status, timer, companion]);

  const style = { '--orbit-side': `${geometry.side}px`, '--orbit-radius': `${geometry.radius}px` } as CSSProperties;
  return (
    <div className="stage" ref={stageRef} style={style}>
      <canvas className="orbit" ref={canvasRef} aria-hidden="true" />
      {children}
    </div>
  );
}
