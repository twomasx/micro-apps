import { frame, n, polyline, seeded, smoothstep, type Point } from './svg.ts';

/**
 * Attention: the Ink. One brush enso on paper. The brush lands low on the left and travels
 * clockwise through most of a circle, so the open gap sits at the lower left. The stroke is
 * solid and wet for its first part, then the bristles run dry and break into streaks.
 * In the app the brush draws while you focus; here it draws, holds, and fades.
 *
 * A smaller cousin of the brush in apps/attention/src/ink/brush.ts: the same start, sweep,
 * wobble, press and dry tail, written out as SVG shapes at build time.
 * Colors from apps/attention/src/ink/draw.ts.
 */

const PAPER = '#f3f3ef';
const INK = '#191919';

const CX = 60;
const CY = 40;
const R = 25;
const WIDTH = 0.12;
const SAMPLES = 220;
const BRISTLES = 14;
const DRAW = 5;
const LOOP = 10;

interface Sample extends Point {
  t: number;
  nx: number;
  ny: number;
  half: number;
  dryness: number;
}

function noise(random: () => number, count: number): (x: number) => number {
  const table = Array.from({ length: count + 2 }, random);
  return (x: number) => {
    const i = Math.floor(x);
    const f = x - i;
    const s = f * f * (3 - 2 * f);
    return table[i % count]! * (1 - s) + table[(i + 1) % count]! * s;
  };
}

function stroke(seed: number) {
  const random = seeded(seed);
  const start = Math.PI * (0.8 + (random() - 0.5) * 0.14);
  const sweep = Math.PI * 2 * (0.86 + random() * 0.07);
  const squash = 1 + (random() - 0.5) * 0.06;
  const phases = [random() * 6.28, random() * 6.28, random() * 6.28];
  const wobble = noise(random, 64);

  const point = (t: number): Point => {
    const angle = start + sweep * t;
    const r =
      (1 + 0.018 * Math.sin(angle * 2 + phases[0]!) + 0.012 * Math.sin(angle * 3 + phases[1]!) + 0.008 * Math.sin(angle * 5 + phases[2]!)) *
      (1 - 0.035 * t * t);
    return { x: Math.cos(angle) * r * squash, y: Math.sin(angle) * r };
  };

  const samples: Sample[] = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const t = i / SAMPLES;
    const p = point(t);
    const a = point(Math.max(0, t - 0.002));
    const b = point(Math.min(1, t + 0.002));
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const land = 0.55 + 0.45 * smoothstep(0, 0.02, t);
    const press = 1 + 0.22 * Math.exp(-((t - 0.035) ** 2) / 0.0006);
    const taper = 1 - 0.38 * smoothstep(0.55, 1, t);
    const half = (WIDTH / 2) * land * press * taper * (1 + 0.34 * (wobble(t * 4.5) - 0.5));
    samples.push({ ...p, t, nx: (b.y - a.y) / len, ny: -(b.x - a.x) / len, half, dryness: 0.95 * smoothstep(0.42, 1, t) ** 1.2 });
  }

  const bristles = Array.from({ length: BRISTLES }, (_, j) => {
    const offset = -1 + (2 * (j + 0.5)) / BRISTLES + (random() - 0.5) * (1.2 / BRISTLES);
    const ink = Math.min(1, Math.max(0, 0.35 + 0.65 * random() - 0.35 * offset * offset));
    return { offset, ink, grain: 14 + 26 * random(), runsOut: 0.7 + 0.32 * ink, streak: noise(random, 64) };
  });

  return { samples, bristles, point, start, sweep };
}

const toScreen = (p: Point): Point => ({ x: CX + p.x * R, y: CY + p.y * R });

export function attentionSpecimen(): string {
  const { samples, bristles, point } = stroke(7);

  // The wet body: a filled band whose width shrinks to nothing as the brush runs dry.
  const body = samples.filter((s) => s.dryness < 0.35);
  const share = (s: Sample) => 1 - smoothstep(0, 0.35, s.dryness);
  const outer = body.map((s) => toScreen({ x: s.x + s.nx * s.half * share(s), y: s.y + s.ny * s.half * share(s) }));
  const inner = body.map((s) => toScreen({ x: s.x - s.nx * s.half * share(s), y: s.y - s.ny * s.half * share(s) })).reverse();
  const shapes = [`<path d="${polyline([...outer, ...inner], true)}" fill="${INK}"/>`];

  // The bristles: thin lines across the stroke's width that skip in streaks as they dry.
  const streaks: string[] = [];
  const hair = n(((WIDTH * R) / BRISTLES) * 1.5);
  for (const bristle of bristles) {
    let run: Point[] = [];
    const flush = () => {
      if (run.length > 1) streaks.push(polyline(run));
      run = [];
    };
    for (const s of samples) {
      const streak = bristle.streak(s.t * bristle.grain);
      const inks =
        s.dryness <= 0
          ? true
          : s.t > bristle.runsOut
            ? streak > 0.9
            : streak > s.dryness * (1.15 - 0.6 * bristle.ink);
      if (inks) run.push(toScreen({ x: s.x + s.nx * s.half * bristle.offset, y: s.y + s.ny * s.half * bristle.offset }));
      else flush();
    }
    flush();
  }
  shapes.push(`<path d="${streaks.join('')}" fill="none" stroke="${INK}" stroke-width="${hair}" stroke-linecap="round"/>`);

  // A mask that opens along the brush's path, so the enso draws itself in the order it was painted.
  const centre = polyline(Array.from({ length: 121 }, (_, i) => toScreen(point(i / 120))));
  const reveal =
    `<mask id="at-reveal" maskUnits="userSpaceOnUse" x="0" y="0" width="120" height="80">` +
    `<path d="${centre}" fill="none" stroke="#fff" stroke-width="${n(WIDTH * R * 2.2)}" stroke-linecap="round" pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="1">` +
    `<animate attributeName="stroke-dashoffset" dur="${LOOP}s" repeatCount="indefinite" values="1;0;0" keyTimes="0;${n(DRAW / LOOP, 4)};1" calcMode="spline" keySplines="0.45 0 0.55 1;0 0 1 1"/>` +
    `</path></mask>`;

  const fade = `<animate attributeName="opacity" dur="${LOOP}s" repeatCount="indefinite" values="0.96;0.96;0;0" keyTimes="0;0.84;0.96;1"/>`;

  return frame(
    'attention',
    `<defs>${reveal}</defs><rect width="120" height="80" fill="${PAPER}"/><g mask="url(#at-reveal)" opacity="0.96">${fade}${shapes.join('')}</g>`,
  );
}
