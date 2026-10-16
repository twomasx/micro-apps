/**
 * The specimens animate with SMIL inside their SVGs. CSS cannot pause SMIL, so this does:
 * with reduced motion each specimen holds one still frame, and otherwise a specimen only
 * runs while it is on screen.
 */

/** The moment of each loop (in seconds) that best shows the app when it cannot move. */
export const STILL_FRAME: Record<string, number> = {
  personality: 4,
  focus: 1.2,
  breathwork: 19,
  attention: 7,
  intention: 0,
};

export function watchSpecimens(root: Document): void {
  const svgs = [...root.querySelectorAll<SVGSVGElement>('svg.specimen-art')];
  if (svgs.length === 0) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const onScreen = new Set<SVGSVGElement>();

  const apply = () => {
    for (const svg of svgs) {
      if (reduced.matches) {
        svg.setCurrentTime(STILL_FRAME[svg.dataset.specimen ?? ''] ?? 0);
        svg.pauseAnimations();
      } else if (onScreen.has(svg)) {
        svg.unpauseAnimations();
      } else {
        svg.pauseAnimations();
      }
    }
  };

  const observer = new IntersectionObserver((records) => {
    for (const record of records) {
      const svg = record.target as SVGSVGElement;
      if (record.isIntersecting) onScreen.add(svg);
      else onScreen.delete(svg);
    }
    apply();
  });
  // Start each loop at its still frame, so a specimen that has not run yet is never blank.
  for (const svg of svgs) {
    svg.setCurrentTime(STILL_FRAME[svg.dataset.specimen ?? ''] ?? 0);
    observer.observe(svg);
  }
  reduced.addEventListener('change', apply);
  apply();
}
