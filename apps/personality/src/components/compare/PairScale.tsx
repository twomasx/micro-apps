import type { CSSProperties } from 'react';

/** Two results on one 0 to 100 scale: a filled marker, a ring, and the gap between them. */
export function PairScale({ a, b }: { a: number; b: number }) {
  const from = Math.min(a, b);
  return (
    <div
      className="pair-scale"
      aria-hidden="true"
      style={{ '--a': a, '--b': b, '--from': from, '--gap': Math.abs(a - b) } as CSSProperties}
    >
      <span className="pair-gap" />
      <span className="pair-marker" data-side="a" />
      <span className="pair-marker" data-side="b" />
    </div>
  );
}
