import { vibrate } from '@micro/platform';

/**
 * Android Chrome only: iPhone Safari has no Vibration API, and there this does nothing.
 * The tick probe never vibrates: a buzz would turn it into something felt, not noticed.
 */
export const VIBRATION = {
  tok: [15, 60, 15],
  bell: 40,
} as const satisfies Record<string, number | number[]>;

export type Buzz = keyof typeof VIBRATION;

export function canVibrate(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

/** Never throws. Returns false when nothing buzzed. */
export function buzz(kind: Buzz): boolean {
  try {
    const pattern = VIBRATION[kind];
    return vibrate(typeof pattern === 'number' ? pattern : [...pattern]);
  } catch {
    return false;
  }
}
