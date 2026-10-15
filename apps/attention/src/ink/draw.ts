import { bodyShare, bristleInks, buildStroke, type Stroke } from './brush';

/** The only three colors in the app. Kept in sync with the tokens in base.css. */
export const PAPER = '#f3f3ef';
export const INK = '#191919';
export const GRAY = '#77756f';

const cache = new Map<string, Stroke>();

/** Strokes are cached by seed and bristle count: building one is the costly part. */
export function strokeFor(seed: number, bristles: number): Stroke {
  const key = `${seed}:${bristles}`;
  let stroke = cache.get(key);
  if (!stroke) {
    stroke = buildStroke(seed, bristles);
    if (cache.size > 400) cache.clear();
    cache.set(key, stroke);
  }
  return stroke;
}

/** Fewer bristles on small circles: they would only blur together. */
export function bristlesForRadius(radiusPx: number): number {
  if (radiusPx < 24) return 7;
  if (radiusPx < 60) return 12;
  return 24;
}

export interface DrawOptions {
  cx: number;
  cy: number;
  radius: number;
  /** 0 to 1: how far the brush has traveled. */
  progress: number;
  /** 0 is ink, 1 is fully faded to gray (a drifted stretch). */
  fade: number;
}

function mix(a: string, b: string, k: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const c = pa.map((v, i) => Math.round(v + (pb[i]! - v) * k));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

/** Paints one enso. The caller clears the canvas. */
export function drawEnso(ctx: CanvasRenderingContext2D, seed: number, o: DrawOptions): void {
  if (o.progress <= 0) return;
  const stroke = strokeFor(seed, bristlesForRadius(o.radius));
  const { samples, bristles, maxHalf } = stroke;
  const last = Math.min(samples.length - 1, Math.floor(o.progress * (samples.length - 1)));
  const color = mix(INK, GRAY, o.fade);
  // A drifted circle also thins out, so it reads lighter than gray type.
  const alpha = 0.96 - 0.38 * o.fade;
  // Small circles keep more of their dry tail, or it vanishes below a pixel and they read as a C.
  const small = o.radius < 60;
  const dryScale = small ? 0.45 : 1;
  const at = (i: number, side: number) => {
    const s = samples[i]!;
    const d = side * s.half * bodyShare(s.dryness) * (side > 0 ? s.outer : s.inner);
    return [o.cx + (s.x + s.nx * d) * o.radius, o.cy + (s.y + s.ny * d) * o.radius] as const;
  };

  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.globalAlpha = alpha;

  // The body: solid ink with ragged edges. As the brush dries it narrows toward the middle,
  // and the bristles take over from the edges in, so there is no seam.
  let bodyEnd = 0;
  while (bodyEnd < last && bodyShare(samples[bodyEnd + 1]!.dryness) > 0) bodyEnd++;
  if (bodyEnd > 0) {
    ctx.beginPath();
    for (let i = 0; i <= bodyEnd; i++) {
      const [x, y] = at(i, 1);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    for (let i = bodyEnd; i >= 0; i--) {
      const [x, y] = at(i, -1);
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    // Round off the end where the brush landed. Same path, one fill, so no darker overlap.
    const s0 = samples[0]!;
    const sx = o.cx + s0.x * o.radius;
    const sy = o.cy + s0.y * o.radius;
    ctx.moveTo(sx + s0.half * o.radius, sy);
    ctx.arc(sx, sy, s0.half * o.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  if (samples[last]!.dryness <= 0) {
    ctx.restore();
    return;
  }

  // The dry part: separate bristles that break into streaks and run out one by one.
  // Bristles overlap a little so the start of the dry part still reads as solid.
  const lineWidth = Math.max(small ? 1.2 : 0.8, ((maxHalf * 2 * o.radius) / bristles.length) * 1.35);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = lineWidth;
  // Bristles sit inside the stroke's edge, so the dry part is no wider than the body was.
  const inset = lineWidth / 2 / o.radius;
  for (const bristle of bristles) {
    ctx.globalAlpha = alpha * (0.7 + 0.3 * bristle.ink);
    ctx.beginPath();
    let pen = false;
    for (let i = 0; i <= last; i++) {
      const s = samples[i]!;
      // Inside the solid body this bristle adds nothing.
      if (s.dryness <= 0 || Math.abs(bristle.offset) < bodyShare(s.dryness) || !bristleInks(bristle, s, dryScale)) {
        pen = false;
        continue;
      }
      // A drying brush splays: bristles spread a little wider than the body was.
      const d = bristle.offset * Math.max(0, s.half * (1 + 0.35 * s.dryness) - inset);
      const x = o.cx + (s.x + s.nx * d) * o.radius;
      const y = o.cy + (s.y + s.ny * d) * o.radius;
      if (pen) ctx.lineTo(x, y);
      else {
        ctx.moveTo(x, y);
        // A single point still leaves a dot of ink.
        ctx.lineTo(x + 0.01, y);
        pen = true;
      }
    }
    ctx.stroke();
  }
  ctx.restore();
}

/** A thin, faint, perfect circle: where the brush will go. */
export function drawGuide(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number, scale: number): void {
  ctx.save();
  ctx.strokeStyle = GRAY;
  ctx.globalAlpha = 0.28;
  ctx.lineWidth = Math.max(1, scale);
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** Sizes a canvas to its box at the screen's pixel density (at most 2x, to save battery). */
export function fitCanvas(canvas: HTMLCanvasElement): { w: number; h: number; dpr: number } {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(1, Math.round(rect.width * dpr));
  const h = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  return { w, h, dpr };
}
