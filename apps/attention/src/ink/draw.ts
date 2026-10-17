import { bodyShare, bristleInks, buildLineStroke, buildStroke, type Stroke } from './brush.ts';

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
    // Small circles need far fewer samples along the ring.
    stroke = buildStroke(seed, bristles, bristles <= 7 ? 140 : bristles <= 12 ? 240 : 420);
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
  // Small circles keep more of their dry tail, or it vanishes below a pixel and they read as a C.
  paintStroke(ctx, strokeFor(seed, bristlesForRadius(o.radius)), {
    ox: o.cx,
    oy: o.cy,
    scale: o.radius,
    progress: o.progress,
    fade: o.fade,
    small: o.radius < 60,
  });
}

/** A brushed chart line through points given in CSS pixels, drawn at `dpr`. */
export function drawInkLine(
  ctx: CanvasRenderingContext2D,
  points: readonly { x: number; y: number }[],
  o: { seed: number; width: number; dpr: number },
): void {
  if (points.length < 2) return;
  const stroke = buildLineStroke(points, o.seed, o.width);
  paintStroke(ctx, stroke, { ox: 0, oy: 0, scale: o.dpr, progress: 1, fade: 0, small: true });
}

/** An ink dot marking a data point, in CSS pixels. */
export function drawInkDot(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, dpr: number): void {
  ctx.save();
  ctx.fillStyle = INK;
  ctx.globalAlpha = 0.96;
  ctx.beginPath();
  ctx.arc(x * dpr, y * dpr, radius * dpr, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

interface PaintOptions {
  /** Drawing position of the stroke's origin, and its units in canvas pixels. */
  ox: number;
  oy: number;
  scale: number;
  progress: number;
  fade: number;
  /** Thicker hairs and less dryness, for strokes only a few pixels wide. */
  small: boolean;
}

function paintStroke(ctx: CanvasRenderingContext2D, stroke: Stroke, o: PaintOptions): void {
  if (o.progress <= 0) return;
  const { samples, bristles, maxHalf } = stroke;
  const last = Math.min(samples.length - 1, Math.floor(o.progress * (samples.length - 1)));
  const color = mix(INK, GRAY, o.fade);
  // A drifted circle also thins out, so it reads lighter than gray type.
  const alpha = 0.96 - 0.38 * o.fade;
  const small = o.small;
  const dryScale = small ? 0.45 : 1;
  const at = (i: number, side: number) => {
    const s = samples[i]!;
    const d = side * s.half * bodyShare(s.dryness) * (side > 0 ? s.outer : s.inner);
    return [o.ox + (s.x + s.nx * d) * o.scale, o.oy + (s.y + s.ny * d) * o.scale] as const;
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
    const sx = o.ox + s0.x * o.scale;
    const sy = o.oy + s0.y * o.scale;
    ctx.moveTo(sx + s0.half * o.scale, sy);
    ctx.arc(sx, sy, s0.half * o.scale, 0, Math.PI * 2);
    ctx.fill();
  }
  if (samples[last]!.dryness <= 0) {
    ctx.restore();
    return;
  }

  // The dry part: separate bristles that break into streaks and run out one by one.
  // Bristles overlap a little so the start of the dry part still reads as solid.
  const lineWidth = Math.max(small ? 1.2 : 0.8, ((maxHalf * 2 * o.scale) / bristles.length) * 1.35);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = lineWidth;
  // Bristles sit inside the stroke's edge, so the dry part is no wider than the body was.
  const inset = lineWidth / 2 / o.scale;
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
      const x = o.ox + (s.x + s.nx * d) * o.scale;
      const y = o.oy + (s.y + s.ny * d) * o.scale;
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
