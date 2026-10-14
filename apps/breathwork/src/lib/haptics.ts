import { vibrate } from '@micro/platform';
import type { CueKind } from './cues';

/**
 * A short buzz at each phase change, different per phase, like the sound cues.
 * Android Chrome only: iPhone Safari has no Vibration API, and there this does nothing.
 */
export const VIBRATION_PATTERNS: Record<CueKind, number | number[]> = {
  in: 40,
  inAgain: 20,
  hold: 12,
  out: [20, 90, 20],
  done: [40, 120, 40, 120, 40],
};

export function canVibrate(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

/** Buzzes for a cue. Never throws. Returns false when nothing buzzed. */
export function vibrateFor(kind: CueKind): boolean {
  try {
    return vibrate(VIBRATION_PATTERNS[kind]);
  } catch {
    return false;
  }
}
