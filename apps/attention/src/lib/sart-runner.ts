import { DIGIT_MS, MASK_MS, type SartItem } from './sart-sequence';
import type { SartTrial } from './sart-score';

/**
 * The SART clock as a pure state machine, stepped once per animation frame.
 * Every digit has a fixed target onset (start + i × trial length), so frame rounding never
 * adds up into drift. A change happens on the frame closest to its target: the switch is made
 * when the time left is under half a frame.
 */
export type RunnerPhase = 'lead' | 'digit' | 'mask' | 'feedback' | 'done';

/** A blank moment before the first digit, so the first one is not missed while settling. */
export const LEAD_MS = 1200;
/** Practice only: how long the feedback after each digit stays up. */
export const FEEDBACK_MS = 1100;

export interface RunnerState {
  items: readonly SartItem[];
  feedbackMs: number;
  phase: RunnerPhase;
  index: number;
  /** Frame time the run started. */
  startAt: number;
  /** Frame time each digit actually appeared. */
  onsets: number[];
  /** Frame time each mask actually appeared. */
  maskOnsets: number[];
  /** Reaction times per digit, ms from its onset. */
  taps: number[][];
}

export function createRunner(items: readonly SartItem[], startAt: number, practice = false): RunnerState {
  return {
    items,
    feedbackMs: practice ? FEEDBACK_MS : 0,
    phase: 'lead',
    index: -1,
    startAt,
    onsets: [],
    maskOnsets: [],
    taps: items.map(() => []),
  };
}

function trialMs(state: RunnerState): number {
  return DIGIT_MS + MASK_MS + state.feedbackMs;
}

/** When digit `i` should appear. */
export function targetOnset(state: RunnerState, i: number): number {
  return state.startAt + LEAD_MS + i * trialMs(state);
}

/**
 * Advances to what should be on screen at frame time `now`. `frameMs` is the measured frame
 * interval. At most one change per frame, so every digit and mask is shown for at least a frame.
 */
export function step(state: RunnerState, now: number, frameMs: number): RunnerState {
  if (state.phase === 'done') return state;
  const due = (target: number) => now >= target - frameMs / 2;
  const next = state.index + 1;

  if (state.phase === 'lead' || state.phase === 'feedback' || (state.phase === 'mask' && state.feedbackMs === 0)) {
    if (next >= state.items.length) {
      const end = state.index >= 0 ? targetOnset(state, state.index) + trialMs(state) : 0;
      return due(end) ? { ...state, phase: 'done' } : state;
    }
    if (!due(targetOnset(state, next))) return state;
    return { ...state, phase: 'digit', index: next, onsets: [...state.onsets, now] };
  }
  if (state.phase === 'digit') {
    if (!due(targetOnset(state, state.index) + DIGIT_MS)) return state;
    return { ...state, phase: 'mask', maskOnsets: [...state.maskOnsets, now] };
  }
  // Practice: mask, then feedback.
  if (!due(targetOnset(state, state.index) + DIGIT_MS + MASK_MS)) return state;
  return { ...state, phase: 'feedback' };
}

/**
 * Records a tap at event time `time`. It belongs to the digit on screen then: the latest one
 * whose onset is at or before it. Taps during the lead-in and the practice feedback are ignored.
 */
export function tap(state: RunnerState, time: number): RunnerState {
  if (state.phase === 'lead' || state.phase === 'feedback' || state.phase === 'done') return state;
  let i = state.index;
  // A tap can be stamped a moment before the frame that showed the next digit.
  while (i > 0 && time < state.onsets[i]!) i--;
  if (i < 0 || time < state.onsets[i]!) return state;
  const taps = state.taps.map((list, k) => (k === i ? [...list, Math.round(time - state.onsets[i]!)] : list));
  return { ...state, taps };
}

export function trialsOf(state: RunnerState): SartTrial[] {
  return state.onsets.map((_, i) => ({ ...state.items[i]!, taps: state.taps[i]! }));
}

export interface TimingReport {
  /** Mean time a digit was on screen, ms. Target 250. */
  meanDigitMs: number;
  /** Largest miss from 250, ms. */
  maxDigitErrorMs: number;
  /** Mean time from one digit to the next, ms. Target 1150 (2250 in practice). */
  meanSoaMs: number;
  /** Largest miss of a digit's onset from its fixed target, ms. */
  maxOnsetErrorMs: number;
}

/** How close the screen came to the intended timing, measured from frame times. */
export function timingReport(state: RunnerState): TimingReport {
  const digit = state.maskOnsets.map((m, i) => m - state.onsets[i]!);
  const soa = state.onsets.slice(1).map((o, i) => o - state.onsets[i]!);
  const onsetError = state.onsets.map((o, i) => Math.abs(o - targetOnset(state, i)));
  const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const round = (x: number) => Math.round(x * 10) / 10;
  return {
    meanDigitMs: round(mean(digit)),
    maxDigitErrorMs: round(Math.max(0, ...digit.map((d) => Math.abs(d - DIGIT_MS)))),
    meanSoaMs: round(mean(soa)),
    maxOnsetErrorMs: round(Math.max(0, ...onsetError)),
  };
}
