import { drawEnso } from './draw.ts';

/**
 * The same enso the app paints on a canvas, written out as SVG shapes. Used at build time for the share image,
 * where there is no canvas. It records the few canvas calls the brush makes and turns each fill or stroke into
 * a <path>.
 */
export function ensoSvg(seed: number, cx: number, cy: number, radius: number): string {
  const shapes: string[] = [];
  let d = '';
  const state = { fillStyle: '#000', strokeStyle: '#000', globalAlpha: 1, lineWidth: 1, lineCap: 'butt', lineJoin: 'miter' };
  const saved: (typeof state)[] = [];
  const n = (value: number) => Math.round(value * 10) / 10;
  const color = (value: string) => {
    // The canvas code writes mixed colors as rgb(r, g, b); SVG takes that as is.
    return value;
  };

  const ctx = {
    ...state,
    save() {
      saved.push({ ...pick(ctx) });
    },
    restore() {
      Object.assign(ctx, saved.pop());
    },
    beginPath() {
      d = '';
    },
    moveTo(x: number, y: number) {
      d += `M${n(x)} ${n(y)}`;
    },
    lineTo(x: number, y: number) {
      d += `L${n(x)} ${n(y)}`;
    },
    closePath() {
      d += 'Z';
    },
    /** The brush only draws whole circles from angle 0, clockwise like the canvas, so they fill the same way. */
    arc(x: number, y: number, r: number) {
      d += `M${n(x + r)} ${n(y)}A${n(r)} ${n(r)} 0 1 1 ${n(x - r)} ${n(y)}A${n(r)} ${n(r)} 0 1 1 ${n(x + r)} ${n(y)}Z`;
    },
    fill() {
      shapes.push(`<path d="${d}" fill="${color(ctx.fillStyle)}" fill-opacity="${n(ctx.globalAlpha * 100) / 100}"/>`);
    },
    stroke() {
      if (!d) return;
      shapes.push(
        `<path d="${d}" fill="none" stroke="${color(ctx.strokeStyle)}" stroke-opacity="${n(ctx.globalAlpha * 100) / 100}" stroke-width="${n(ctx.lineWidth)}" stroke-linecap="${ctx.lineCap}" stroke-linejoin="${ctx.lineJoin}"/>`,
      );
    },
  };

  function pick(from: typeof ctx): typeof state {
    const { fillStyle, strokeStyle, globalAlpha, lineWidth, lineCap, lineJoin } = from;
    return { fillStyle, strokeStyle, globalAlpha, lineWidth, lineCap, lineJoin };
  }

  drawEnso(ctx as unknown as CanvasRenderingContext2D, seed, { cx, cy, radius, progress: 1, fade: 0 });
  return `<g>${shapes.join('')}</g>`;
}
