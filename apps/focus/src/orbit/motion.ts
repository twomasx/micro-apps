/**
 * The numbers behind the orbit's motion. Nothing here draws.
 *
 * Safety rule: nothing on screen moves or changes brightness at the beat rate.
 * The orbit turns at a slowed rate that is never above 0.6 turns per second.
 */
export const MAX_VISUAL_HZ = 0.6;
/** With "reduce motion" on, one turn takes 100 seconds. */
export const REDUCED_MOTION_HZ = 0.01;
/** A paused or idle orbit drifts at this share of its playing speed. */
export const IDLE_SPEED = 0.3;
/** In the last minute the two stars draw this much closer together. */
export const CLOSING_SHRINK = 0.25;
const CLOSING_MS = 60_000;
/** Shorter sessions (and the 60 second preview) have no closing phase. */
const CLOSING_MIN_DURATION_MS = 3 * 60_000;

/** Orbit speed in turns per second: slow, rising gently with the beat rate. */
export function visualRate(beatHz: number, reducedMotion = false): number {
  if (reducedMotion) return REDUCED_MOTION_HZ;
  const beat = Number.isFinite(beatHz) ? Math.max(0, beatHz) : 0;
  return Math.min(MAX_VISUAL_HZ, 0.08 + Math.log2(beat + 1) * 0.09);
}

/** Moves `current` toward `target`. Frame-rate independent: after `timeConstant` seconds, 63% of the way. */
export function approach(current: number, target: number, dtSeconds: number, timeConstant: number): number {
  if (timeConstant <= 0) return target;
  return target + (current - target) * Math.exp(-Math.max(0, dtSeconds) / timeConstant);
}

export function smoothstep(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

/** 0 until the last minute of a session, then rises smoothly to 1 at the end. */
export function closing(remainingMs: number, durationMs: number): number {
  if (durationMs < CLOSING_MIN_DURATION_MS) return 0;
  return smoothstep(1 - remainingMs / CLOSING_MS);
}

export type Rgb = readonly [number, number, number];

export function hexToRgb(hex: string): Rgb {
  const value = Number.parseInt(hex.replace('#', ''), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

export function approachRgb(current: Rgb, target: Rgb, dtSeconds: number, timeConstant: number): Rgb {
  return [
    approach(current[0], target[0], dtSeconds, timeConstant),
    approach(current[1], target[1], dtSeconds, timeConstant),
    approach(current[2], target[2], dtSeconds, timeConstant),
  ];
}

export function rgba(color: Rgb, alpha: number): string {
  return `rgba(${Math.round(color[0])},${Math.round(color[1])},${Math.round(color[2])},${alpha})`;
}

export interface OrbitGeometry {
  /** Distance of each star from the centre, in CSS pixels. */
  radius: number;
  /** Radius of the timer ring. */
  ring: number;
  /** Side of the square canvas: the ring plus room for the glow. */
  side: number;
}

const RING_SCALE = 1.42;
const GLOW_MARGIN = 36;
const MAX_RADIUS = 230;

/** Fits the orbit and its timer ring into the space between the heading and the controls. */
export function orbitGeometry(stageWidth: number, stageHeight: number): OrbitGeometry {
  const room = Math.max(0, Math.min(stageWidth, stageHeight));
  const radius = Math.min(MAX_RADIUS, (room * 0.47) / RING_SCALE);
  const ring = radius * RING_SCALE;
  return { radius, ring, side: Math.ceil(ring * 2 + GLOW_MARGIN * 2) };
}
