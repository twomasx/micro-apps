import { frame, polyline, timeline, type Point } from './svg.ts';

/**
 * Breathwork: the Pattern. Each technique is drawn as its own shape: one side per phase,
 * each side as long as its seconds. Breathing in goes up, holding goes across, breathing out
 * comes down, clockwise. A yellow dot traces the outline in real time, a white line follows
 * it, and the halo around the dot swells on the breath in. The specimen runs the three free
 * techniques in turn: the cyclic sigh, box, and 4-7-8.
 *
 * The geometry follows the rules in apps/breathwork/src/lib/shape.ts, rebuilt here for just
 * these three shapes. Colors from apps/breathwork/src/base.css.
 */

const COBALT = '#2341d6';
const WHITE = '#f6f7fb';
const TRACK = 'rgba(246,247,251,0.32)';
const SUN = '#ffd45c';

type Kind = 'in' | 'hold' | 'out';

interface Technique {
  id: string;
  phases: { kind: Kind; seconds: number }[];
  /** The outline in math coordinates (y up), as corner points or sampled curves. */
  outline: Point[];
}

const polar = (length: number, degrees: number): Point => ({
  x: length * Math.cos((degrees * Math.PI) / 180),
  y: length * Math.sin((degrees * Math.PI) / 180),
});

function quadratic(a: Point, c: Point, b: Point, t: number): Point {
  const u = 1 - t;
  return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y };
}

function curvePoints(a: Point, c: Point, b: Point, samples = 48): Point[] {
  return Array.from({ length: samples + 1 }, (_, i) => quadratic(a, c, b, i / samples));
}

const length = (points: readonly Point[]) =>
  points.slice(1).reduce((sum, p, i) => sum + Math.hypot(p.x - points[i]!.x, p.y - points[i]!.y), 0);

/** A side from a to b that bows to the left of travel until it is exactly `target` long. */
function bowed(a: Point, b: Point, target: number): Point[] {
  const span = Math.hypot(b.x - a.x, b.y - a.y);
  const left = { x: -(b.y - a.y) / span, y: (b.x - a.x) / span };
  const middle = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const control = (h: number) => ({ x: middle.x + left.x * h, y: middle.y + left.y * h });
  let low = 0;
  let high = target;
  for (let i = 0; i < 50; i++) {
    const h = (low + high) / 2;
    if (length(curvePoints(a, control(h), b)) < target) low = h;
    else high = h;
  }
  return curvePoints(a, control((low + high) / 2), b);
}

/** Cyclic sigh: in 2 s at 80 degrees, a 1 s top-up at 60 degrees, then 6 s out as one long curve home. */
function sigh(): Point[] {
  const origin = { x: 0, y: 0 };
  const first = polar(2, 80);
  const top = { x: first.x + polar(1, 60).x, y: first.y + polar(1, 60).y };
  return [origin, first, ...bowed(top, origin, 6)];
}

/** Box: four sides of 4 s, a square. */
function box(): Point[] {
  return [
    { x: 0, y: 0 },
    { x: 0, y: 4 },
    { x: 4, y: 4 },
    { x: 4, y: 0 },
    { x: 0, y: 0 },
  ];
}

/**
 * 4-7-8: up 4, across 7, down 8, all straight, as tall as it can be. With no hold at the
 * bottom the two slanted sides must cancel the top: sqrt(16 - h^2) + sqrt(64 - h^2) = 7.
 */
function fourSevenEight(): Point[] {
  const P = (h: number) => Math.sqrt(Math.max(0, 16 - h * h));
  const Q = (h: number) => Math.sqrt(Math.max(0, 64 - h * h));
  let low = 1.8;
  let high = 4;
  for (let i = 0; i < 60; i++) {
    const h = (low + high) / 2;
    if (P(h) + Q(h) > 7) low = h;
    else high = h;
  }
  const h = (low + high) / 2;
  const p = -P(h);
  return [
    { x: 0, y: 0 },
    { x: p, y: h },
    { x: p + 7, y: h },
    { x: 0, y: 0 },
  ];
}

export const techniques: readonly Technique[] = [
  {
    id: 'sigh',
    phases: [
      { kind: 'in', seconds: 2 },
      { kind: 'in', seconds: 1 },
      { kind: 'out', seconds: 6 },
    ],
    outline: sigh(),
  },
  {
    id: 'box',
    phases: [
      { kind: 'in', seconds: 4 },
      { kind: 'hold', seconds: 4 },
      { kind: 'out', seconds: 4 },
      { kind: 'hold', seconds: 4 },
    ],
    outline: box(),
  },
  {
    id: '478',
    phases: [
      { kind: 'in', seconds: 4 },
      { kind: 'hold', seconds: 7 },
      { kind: 'out', seconds: 8 },
    ],
    outline: fourSevenEight(),
  },
];

/** Fits an outline into a square of `size` centred on the specimen, flipping y for the screen. */
export function fit(outline: readonly Point[], size: number): Point[] {
  const xs = outline.map((p) => p.x);
  const ys = outline.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const w = Math.max(...xs) - minX;
  const h = Math.max(...ys) - minY;
  const k = size / Math.max(w, h);
  const left = 60 - (w * k) / 2;
  const top = 40 - (h * k) / 2;
  return outline.map((p) => ({ x: left + (p.x - minX) * k, y: top + (h - (p.y - minY)) * k }));
}

const seconds = (t: Technique) => t.phases.reduce((sum, p) => sum + p.seconds, 0);

/** Halo radius at each phase boundary: it grows while breathing in and shrinks while breathing out. */
function haloValues(t: Technique): number[] {
  const total = t.phases.filter((p) => p.kind === 'in').reduce((sum, p) => sum + p.seconds, 0);
  let lung = 0;
  const values = [lung];
  for (const phase of t.phases) {
    if (phase.kind === 'in') lung += phase.seconds / total;
    if (phase.kind === 'out') lung = 0;
    values.push(lung);
  }
  return values.map((level) => 2.6 + 2.4 * level);
}

const FADE = 0.5;

export function breathworkSpecimen(): string {
  const loop = techniques.reduce((sum, t) => sum + seconds(t), 0);
  const parts: string[] = [`<rect width="120" height="80" fill="${COBALT}"/>`];

  let start = 0;
  for (const t of techniques) {
    const duration = seconds(t);
    const end = start + duration;
    const at = (s: number) => s / loop;
    const id = `bw-${t.id}`;
    const d = polyline(fit(t.outline, 54));
    const repeat = `dur="${loop}s" repeatCount="indefinite"`;

    // Visible only during its own breath, with a short fade at each end.
    const visible = [0, at(start), at(start + FADE), at(end - FADE), at(end), 1];
    const show = `<animate attributeName="opacity" ${repeat} ${timeline([0, 0, 1, 1, 0, 0], visible)}/>`;

    // The dot moves at an even speed along the outline. Side lengths match their seconds,
    // so an even speed spends exactly each phase's seconds on its side.
    const travel = [0, at(start), at(end), 1];

    const phaseTimes = [at(start)];
    let clock = start;
    for (const phase of t.phases) {
      clock += phase.seconds;
      phaseTimes.push(at(clock));
    }
    const halo = haloValues(t);

    parts.push(
      `<g opacity="0">${show}`,
      `<path id="${id}" d="${d}" fill="none" stroke="${TRACK}" stroke-width="0.8" stroke-linejoin="round"/>`,
      `<path d="${d}" fill="none" stroke="${WHITE}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="1">` +
        `<animate attributeName="stroke-dashoffset" ${repeat} ${timeline([1, 1, 0, 0], travel)}/></path>`,
      `<g><animateMotion ${repeat} ${timeline([0, 0, 1, 1], travel).replace('values=', 'keyPoints=')} calcMode="linear"><mpath href="#${id}"/></animateMotion>` +
        `<circle r="2.6" fill="${SUN}" opacity="0.22"><animate attributeName="r" ${repeat} ${timeline([halo[0]!, ...halo, halo.at(-1)!], [0, ...phaseTimes, 1])}/></circle>` +
        `<circle r="1.7" fill="${SUN}"/></g>`,
      `</g>`,
    );
    start = end;
  }

  return frame('breathwork', parts.join(''));
}
