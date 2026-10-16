import { darken, desaturate, lighten, rgbCss, type Rgb } from '../lib/color.ts';
import type { Aim } from '../lib/scoring.ts';
import { SEAM_CLAMP } from '../lib/tug.ts';
import { speckAlpha, speckTravel, type Speck } from './specks.ts';

/**
 * Draws the tug of war: two colors edge to edge, a living seam between them, a glow on the winning side,
 * a quiet glow on your side of the seam and one speck per bit.
 *
 * Soft light comes from layered strokes and gradients, not canvas blur filters, which iPhone Safari lacks
 * and which cost too much per frame on mid-range Android phones.
 */

export interface FieldScene {
  left: Rgb;
  right: Rgb;
  /** Seam position as a share of the width from the left edge. Comes from the score (see tug.ts). */
  seam: number;
  /** Raw lean of the bits shown: positive when 1s (the right color) lead. */
  lean: number;
  /** Your color, once the server has picked it. */
  aim: Aim | null;
  specks: readonly Speck[];
  /** Seconds, for the seam's slow living movement. Held still under reduced motion. */
  time: number;
}

/** The seam's sideways wave, as a share of the width. Small, slow and the same on every run. */
function wave(y: number, t: number): number {
  return (
    0.022 * Math.sin(y * 5.2 + t * 1.1) + 0.008 * Math.sin(y * 13 - t * 0.8) + 0.016 * Math.sin(y * 2.1 - t * 0.35)
  );
}

/** How clearly one side is winning, 0 to 1. */
export function winAmount(lean: number): number {
  return Math.min(1, Math.abs(lean) / SEAM_CLAMP);
}

export function drawField(ctx: CanvasRenderingContext2D, width: number, height: number, scene: FieldScene): void {
  const { seam, lean, aim, specks, time } = scene;
  const unit = Math.min(width, height) / 400;
  const step = Math.max(4, Math.round(height / 120));
  const ys: number[] = [];
  const xs: number[] = [];
  for (let y = 0; y <= height + step; y += step) {
    const yy = Math.min(y, height);
    ys.push(yy);
    xs.push(width * (seam + wave(yy / height, time)));
  }
  const seamAt = (y: number) => {
    const i = Math.min(ys.length - 1, Math.max(0, Math.round(y / step)));
    return xs[i]!;
  };

  // The winner brightens a little and glows. The loser darkens and loses some saturation.
  const win = winAmount(lean);
  const rightWins = lean > 0;
  const winner = (c: Rgb) => lighten(c, 0.08 * win);
  const loser = (c: Rgb) => desaturate(darken(c, 0.3 * win), 0.5 * win);
  const left = win === 0 ? scene.left : rightWins ? loser(scene.left) : winner(scene.left);
  const right = win === 0 ? scene.right : rightWins ? winner(scene.right) : loser(scene.right);

  const seamPath = () => {
    ctx.beginPath();
    ctx.moveTo(xs[0]!, ys[0]!);
    for (let i = 1; i < xs.length; i++) ctx.lineTo(xs[i]!, ys[i]!);
  };
  const regionPath = (side: 'left' | 'right') => {
    const edge = side === 'left' ? -2 : width + 2;
    ctx.beginPath();
    ctx.moveTo(edge, -2);
    for (let i = 0; i < xs.length; i++) ctx.lineTo(xs[i]!, ys[i]!);
    ctx.lineTo(edge, height + 2);
    ctx.closePath();
  };

  // Left color fills everything, then the right color fills its side of the seam.
  const leftFill = ctx.createLinearGradient(0, 0, width * 0.3, height);
  leftFill.addColorStop(0, rgbCss(darken(left, 0.14)));
  leftFill.addColorStop(1, rgbCss(lighten(left, 0.05)));
  ctx.fillStyle = leftFill;
  ctx.fillRect(0, 0, width, height);

  regionPath('right');
  const rightFill = ctx.createLinearGradient(width, 0, width * 0.7, height);
  rightFill.addColorStop(0, rgbCss(darken(right, 0.14)));
  rightFill.addColorStop(1, rgbCss(lighten(right, 0.05)));
  ctx.fillStyle = rightFill;
  ctx.fill();

  // The winning side glows from its middle, in proportion to how far the score has gone.
  if (win > 0.01) {
    const base = rightWins ? scene.right : scene.left;
    const x = rightWins ? seam * width + (1 - seam) * width * 0.5 : seam * width * 0.5;
    ctx.save();
    regionPath(rightWins ? 'right' : 'left');
    ctx.clip();
    const glow = ctx.createRadialGradient(x, height * 0.45, 0, x, height * 0.45, Math.max(width, height) * 0.6);
    glow.addColorStop(0, rgbCss(lighten(base, 0.6), 0.5 * win));
    glow.addColorStop(1, rgbCss(base, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Your side of the seam carries a soft, steady glow in your color. It says which side is yours
  // without anything that looks like a handle.
  if (aim) {
    const mine = aim === 'left' ? scene.left : scene.right;
    ctx.save();
    regionPath(aim);
    ctx.clip();
    for (const [w, a] of [
      [64, 0.08],
      [36, 0.12],
      [16, 0.18],
    ] as const) {
      ctx.strokeStyle = rgbCss(lighten(mine, 0.75), a);
      ctx.lineWidth = w * unit;
      seamPath();
      ctx.stroke();
    }
    ctx.restore();
  }

  // The seam: a soft bright line.
  for (const [w, a] of [
    [18, 0.07],
    [8, 0.14],
    [1.6, 0.8],
  ] as const) {
    ctx.strokeStyle = `rgb(255 255 255 / ${a})`;
    ctx.lineWidth = w * unit;
    seamPath();
    ctx.stroke();
  }

  // One speck per bit, drifting from the seam into the side it favors: a faint core in a soft halo,
  // so it reads as light rather than a dot. Sized to the shorter side, capped so big screens stay quiet.
  const speckUnit = Math.min(unit, 2.4);
  const core = 1.15 * speckUnit;
  const halo = 3.6 * speckUnit;
  for (const speck of specks) {
    const y = speck.y * height + Math.sin(speck.wobble + speck.age * 3) * 6 * unit;
    const x0 = seamAt(y);
    const room = speck.side > 0 ? width - x0 : x0;
    const x = x0 + speck.side * room * 0.4 * speckTravel(speck.age);
    const alpha = speckAlpha(speck.age);
    ctx.fillStyle = `rgb(255 255 255 / ${(0.07 * alpha).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(x, y, halo, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgb(255 255 255 / ${(0.42 * alpha).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(x, y, core, 0, Math.PI * 2);
    ctx.fill();
  }
}
