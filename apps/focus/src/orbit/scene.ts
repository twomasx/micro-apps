import type { Status } from '../lib/player';
import { progress, remainingMs, type SessionTimer } from '../lib/timer';
import {
  CLOSING_SHRINK,
  IDLE_SPEED,
  approach,
  approachRgb,
  closing,
  hexToRgb,
  rgba,
  smoothstep,
  visualRate,
  type OrbitGeometry,
  type Rgb,
} from './motion';
import { GOLD, LAVENDER, STAR } from './tints';

export interface SceneInput {
  beat: number;
  status: Status;
  timer: SessionTimer;
  /** Colour of the right-ear star, as hex. */
  companion: string;
}

export interface OrbitScene {
  setInput(input: SceneInput): void;
  setGeometry(geometry: OrbitGeometry): void;
  setReducedMotion(reduced: boolean): void;
  /** Starts drawing. Safe to call twice. */
  start(): void;
  /** Stops drawing, for when the page is hidden. */
  stop(): void;
}

const TAU = Math.PI * 2;
const TRAIL_STEPS = 30;
const BLOOM_SECONDS = 3.5;
/** With reduced motion the picture barely changes, so it is redrawn 10 times a second. */
const REDUCED_FRAME_MS = 100;

const STAR_RGB = hexToRgb(STAR);
const GOLD_RGB = hexToRgb(GOLD);
const LAVENDER_RGB = hexToRgb(LAVENDER);

/**
 * Draws the two orbiting stars and the timer ring.
 * Every value eases toward its target, so nothing on screen jumps.
 * The speed comes from visualRate(), which is capped at 0.6 turns per second.
 */
export function createOrbitScene(canvas: HTMLCanvasElement): OrbitScene {
  const maybeContext = canvas.getContext('2d');
  if (!maybeContext) throw new Error('Canvas 2D is not available');
  const ctx: CanvasRenderingContext2D = maybeContext;

  let input: SceneInput | null = null;
  let geometry: OrbitGeometry = { radius: 0, ring: 0, side: 0 };
  let reduced = false;
  let frame: number | undefined;
  let last = 0;
  let dpr = 1;

  let angle = -Math.PI / 2;
  let rate = 0;
  /** 0 idle, 1 playing. */
  let energy = 0;
  /** 0 two stars, 1 one star at the centre (session complete). */
  let merge = 0;
  let close = 0;
  let shownProgress = 0;
  let bloom = 1;
  let companion: Rgb = GOLD_RGB;
  let wasComplete = false;
  /** The drawn size eases toward the measured size, so the orbit grows and shrinks smoothly. */
  let shownRadius = 0;
  let shownRing = 0;

  function step(dt: number, now: number) {
    if (!input) return;
    const playing = input.status === 'playing';
    const complete = input.status === 'complete';
    const ease = reduced ? 0 : 1;

    rate = approach(rate, visualRate(input.beat, reduced), dt, 0.6 * ease);
    energy = approach(energy, playing ? 1 : 0, dt, 0.7 * ease);
    merge = approach(merge, complete ? 1 : 0, dt, 0.9 * ease);
    companion = approachRgb(companion, hexToRgb(input.companion), dt, 0.7 * ease);

    const speed = reduced ? rate : rate * (IDLE_SPEED + (1 - IDLE_SPEED) * energy);
    angle = (angle + speed * TAU * dt) % TAU;

    const inSession = playing || input.status === 'paused';
    const closeTarget = inSession ? closing(remainingMs(input.timer, now), input.timer.durationMs) : 0;
    close = approach(close, closeTarget, dt, 1.2 * ease);

    const progressTarget = complete ? 1 : inSession ? progress(input.timer, now) : 0;
    shownProgress = approach(shownProgress, progressTarget, dt, 0.35 * ease);

    if (complete && !wasComplete) bloom = reduced ? 1 : 0;
    wasComplete = complete;
    bloom = Math.min(1, bloom + dt / BLOOM_SECONDS);

    shownRadius = approach(shownRadius, geometry.radius, dt, 0.35 * ease);
    shownRing = approach(shownRing, geometry.ring, dt, 0.35 * ease);
  }

  function glow(x: number, y: number, radius: number, color: Rgb, alpha: number) {
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, rgba(color, 0.9 * alpha));
    gradient.addColorStop(0.14, rgba(color, 0.42 * alpha));
    gradient.addColorStop(0.45, rgba(color, 0.1 * alpha));
    gradient.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, TAU);
    ctx.fill();
  }

  function draw() {
    const { side } = geometry;
    const ring = shownRing;
    const c = side / 2;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, side, side);
    if (!input || side === 0) return;

    // Timer ring: a faint circle that fills with gold as the session runs.
    ctx.lineWidth = 1;
    ctx.strokeStyle = rgba(LAVENDER_RGB, 0.14 + 0.08 * energy);
    ctx.beginPath();
    ctx.arc(c, c, ring, 0, TAU);
    ctx.stroke();
    if (shownProgress > 0.0005) {
      const start = -Math.PI / 2;
      const end = start + shownProgress * TAU;
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.strokeStyle = rgba(GOLD_RGB, 0.45 + 0.35 * energy + 0.2 * merge);
      ctx.beginPath();
      ctx.arc(c, c, ring, start, end);
      ctx.stroke();
      if (shownProgress < 0.9995) {
        const hx = c + Math.cos(end) * ring;
        const hy = c + Math.sin(end) * ring;
        glow(hx, hy, 9, GOLD_RGB, 0.5 + 0.4 * energy);
        ctx.fillStyle = rgba(GOLD_RGB, 0.95);
        ctx.beginPath();
        ctx.arc(hx, hy, 2, 0, TAU);
        ctx.fill();
      }
    }

    // One slow ring that opens once when the session completes. It is not a flash.
    if (bloom < 1) {
      const t = smoothstep(bloom);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = rgba(STAR_RGB, 0.3 * (1 - t));
      ctx.beginPath();
      ctx.arc(c, c, ring * (0.15 + 0.85 * t), 0, TAU);
      ctx.stroke();
    }

    const apart = 1 - smoothstep(merge);
    const radius = shownRadius * (1 - CLOSING_SHRINK * close) * apart;
    const trail = reduced ? 0 : (0.3 + 1.45 * energy) * apart;
    // Stars grow a little with the orbit, so they do not look lost on a tablet or desktop.
    const scale = Math.min(1.7, Math.max(1, shownRadius / 95));
    const glowRadius = (20 + 9 * energy) * scale;
    const core = 3.1 * scale;

    const bodies: [number, Rgb][] = [
      [angle, STAR_RGB],
      [angle + Math.PI, companion],
    ];
    if (apart > 0.02) {
      for (const [a, color] of bodies) {
        if (trail > 0.01) {
          // Flat ends that just overlap: round ends would show as beads along the trail.
          ctx.lineCap = 'butt';
          for (let i = 0; i < TRAIL_STEPS; i++) {
            const from = a - (trail * i) / TRAIL_STEPS;
            const to = a - (trail * (i + 1.08)) / TRAIL_STEPS;
            const fade = 1 - i / TRAIL_STEPS;
            ctx.strokeStyle = rgba(color, (0.16 + 0.34 * energy) * fade * fade * apart);
            ctx.lineWidth = (0.4 + 2 * fade) * scale;
            ctx.beginPath();
            ctx.arc(c, c, radius, to, from);
            ctx.stroke();
          }
        }
        const x = c + Math.cos(a) * radius;
        const y = c + Math.sin(a) * radius;
        glow(x, y, glowRadius, color, (0.6 + 0.4 * energy) * apart);
        ctx.fillStyle = rgba(color, apart);
        ctx.beginPath();
        ctx.arc(x, y, core, 0, TAU);
        ctx.fill();
      }
    }
    if (merge > 0.02) {
      const m = smoothstep(merge);
      glow(c, c, (26 + 30 * m) * scale, companion, 0.55 * m);
      glow(c, c, (18 + 14 * m) * scale, STAR_RGB, m);
      ctx.fillStyle = rgba(STAR_RGB, m);
      ctx.beginPath();
      ctx.arc(c, c, core + 1.6 * m * scale, 0, TAU);
      ctx.fill();
    }
  }

  function loop(time: number) {
    frame = requestAnimationFrame(loop);
    if (reduced && time - last < REDUCED_FRAME_MS) return;
    // After a pause (hidden tab) the first frame must not leap ahead.
    const dt = last === 0 ? 0 : Math.min(0.05, (time - last) / 1000);
    last = time;
    step(reduced ? Math.max(dt, REDUCED_FRAME_MS / 1000) : dt, Date.now());
    draw();
  }

  return {
    setInput(next) {
      if (!input) {
        // First input: start in place, with nothing to ease from.
        rate = visualRate(next.beat, reduced);
        companion = hexToRgb(next.companion);
        wasComplete = next.status === 'complete';
        merge = wasComplete ? 1 : 0;
      }
      input = next;
    },
    setGeometry(next) {
      if (geometry.side === 0) {
        shownRadius = next.radius;
        shownRing = next.ring;
      }
      geometry = next;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      const pixels = Math.round(next.side * dpr);
      if (canvas.width !== pixels) {
        canvas.width = pixels;
        canvas.height = pixels;
      }
      draw();
    },
    setReducedMotion(next) {
      reduced = next;
    },
    start() {
      if (frame !== undefined) return;
      last = 0;
      frame = requestAnimationFrame(loop);
    },
    stop() {
      if (frame !== undefined) cancelAnimationFrame(frame);
      frame = undefined;
    },
  };
}
