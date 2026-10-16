import type { Aim } from './scoring.ts';

/**
 * The run protocol, shared by the server and every exercise screen.
 *
 * POST /api/runs answers with one Server-Sent Events stream for the whole run:
 * a `start` event, a `bits` event about every 250 ms, then an `end` event.
 */

export const BITS_PER_SECOND = 200;
export const BATCH_MS = 250;
/** Run lengths in seconds. The first is the standard run; the others need Lab Pass. */
export const RUN_SECONDS = [20, 60, 120] as const;
export type RunSeconds = (typeof RUN_SECONDS)[number];
export const STANDARD_SECONDS: RunSeconds = 20;

/** Exercises that use the protocol. A new exercise is a new screen plus a new kind. */
export const KINDS = ['tug'] as const;
export type Kind = (typeof KINDS)[number];

export type Source = 'crypto';
export type RunStatus = 'running' | 'complete' | 'abandoned';

export interface StartRequest {
  deviceId: string;
  kind: Kind;
  seconds?: RunSeconds;
  /** The device's time zone, so the free runs reset at its own midnight. */
  timeZone?: string;
}

/** Free devices get this many runs a day. Lab Pass has no limit. */
export const FREE_RUNS_PER_DAY = 5;

export interface StartEvent {
  runId: string;
  aim: Aim;
  lengthBits: number;
  source: Source;
  bitsPerSecond: number;
}

export interface BitsEvent {
  /** This batch as "0" and "1" characters, oldest first. */
  bits: string;
  /** Bits in the run so far, this batch included. */
  n: number;
  /** Ones minus zeros so far. */
  deviation: number;
}

export interface EndEvent {
  status: Exclude<RunStatus, 'running'>;
  n: number;
  deviation: number;
  /** The recorded score: toward the aim, divided by the square root of the planned length. */
  z: number;
}

export interface RunResult {
  runId: string;
  kind: Kind;
  aim: Aim;
  source: Source;
  lengthBits: number;
  n: number;
  deviation: number;
  z: number;
  status: RunStatus;
  createdAt: string;
  /** Every bit of the run as "0" and "1". Nothing is hidden. */
  bits: string;
}

export function lengthBitsFor(seconds: RunSeconds): number {
  return seconds * BITS_PER_SECOND;
}
