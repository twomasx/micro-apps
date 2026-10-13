import { useEffect, useState } from 'react';

function prefersReducedMotion(): boolean {
  // No matchMedia (tests, very old browsers): skip the animation.
  if (typeof window.matchMedia !== 'function') return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Milliseconds since the component appeared, counted once per frame up to `totalMs`.
 * Returns `totalMs` straight away when the device asks for reduced motion.
 */
export function useReveal(totalMs: number): number {
  const [elapsed, setElapsed] = useState(() => (prefersReducedMotion() ? totalMs : 0));

  useEffect(() => {
    if (prefersReducedMotion()) return;
    let frame = 0;
    let start: number | undefined;
    const tick = (now: number) => {
      start ??= now;
      const passed = Math.min(now - start, totalMs);
      setElapsed(passed);
      if (passed < totalMs) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [totalMs]);

  return elapsed;
}

/** Progress from 0 to 1 of one step that starts at `delayMs` and lasts `durationMs`, eased out. */
export function revealStep(elapsedMs: number, delayMs: number, durationMs: number): number {
  const linear = Math.min(Math.max((elapsedMs - delayMs) / durationMs, 0), 1);
  return 1 - (1 - linear) ** 3;
}
