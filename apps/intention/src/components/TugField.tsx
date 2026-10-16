import { useEffect, useRef } from 'react';
import { drawField } from '../field/draw.ts';
import { ageSpecks, spawnSpecks, type Speck } from '../field/specks.ts';
import { hexToRgb } from '../lib/color.ts';
import type { ColorPair } from '../lib/pairs.ts';
import type { RunSession } from '../lib/run-session.ts';
import { rawLean, SEAM_CLAMP, seamPosition } from '../lib/tug.ts';

/**
 * The seam follows the score with a very short lag (80 ms), the same in every direction and at every point
 * of the run. It only softens the first few bits, when one bit can move the score a long way. It never
 * overshoots and it settles on the true position within a few frames.
 */
const SEAM_LAG_S = 0.08;
/** Device pixels per CSS pixel are capped, so a 3x phone does not draw 2.25 times the pixels for no gain. */
const MAX_DPR = 2;
/**
 * The canvas is also capped at about 1.6 million pixels (a phone at 2x is about 1.2 million). The field is
 * soft gradients, so big screens lose no visible sharpness and keep 60 fps.
 */
const MAX_PIXELS = 1_600_000;

interface Props {
  session: RunSession;
  pair: ColorPair;
  reducedMotion: boolean;
}

/** The full-screen tug of war. Draws every frame from the run session, outside React rendering. */
export function TugField({ session, pair, reducedMotion }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // The drawing loop reads the latest colors and motion setting without restarting.
  const live = useRef({ pair, reducedMotion });
  useEffect(() => {
    live.current = { pair, reducedMotion };
  }, [pair, reducedMotion]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;
    const specks: Speck[] = [];
    let seam = 0.5;
    let time = 0;
    let last = performance.now();
    let frame = 0;

    const fit = () => {
      const area = Math.max(1, canvas.clientWidth * canvas.clientHeight);
      const dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1, Math.sqrt(MAX_PIXELS / area));
      const width = Math.round(canvas.clientWidth * dpr);
      const height = Math.round(canvas.clientHeight * dpr);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
    };

    const draw = (now: number) => {
      const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
      last = now;
      const { pair: colors, reducedMotion: still } = live.current;
      const shown = session.frame(now);
      const target = seamPosition(shown.deviation, shown.n);
      seam += (target - seam) * (1 - Math.exp(-dt / SEAM_LAG_S));
      if (Math.abs(target - seam) < 0.0005) seam = target;

      if (still) {
        specks.length = 0;
      } else {
        time += dt;
        spawnSpecks(specks, shown.newBits);
        ageSpecks(specks, dt);
      }
      fit();
      const aim = session.getSnapshot().start?.aim ?? null;
      drawField(ctx, canvas.width, canvas.height, {
        left: hexToRgb(colors.left.hex),
        right: hexToRgb(colors.right.hex),
        seam,
        lean: Math.max(-SEAM_CLAMP, Math.min(SEAM_CLAMP, rawLean(shown.deviation, shown.n))),
        aim,
        specks,
        time,
      });
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [session]);

  return <canvas ref={canvasRef} className="tug-field" aria-hidden="true" />;
}
