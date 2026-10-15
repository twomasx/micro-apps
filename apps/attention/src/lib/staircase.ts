/**
 * The stretch length rules, from MediTrain (Ziegler and others, 2019).
 * First stretch 20 s. "I stayed" makes the next one 10% longer, "I drifted" 20% shorter.
 * The 10 s floor and 10 min ceiling are ours; the paper gives none.
 */
export const STAIRCASE = {
  firstSeconds: 20,
  upFraction: 0.1,
  downFraction: 0.2,
  /** At short lengths 10% rounds to nothing, so a yes always adds at least this much. */
  minStepUpSeconds: 1,
  minSeconds: 10,
  maxSeconds: 600,
} as const;

export function clampStretch(seconds: number): number {
  if (!Number.isFinite(seconds)) return STAIRCASE.firstSeconds;
  return Math.min(STAIRCASE.maxSeconds, Math.max(STAIRCASE.minSeconds, Math.round(seconds)));
}

/** The next stretch length in whole seconds, after an answer to the bell. */
export function nextStretch(currentSeconds: number, stayed: boolean): number {
  const current = clampStretch(currentSeconds);
  if (stayed) {
    const longer = Math.round(current * (1 + STAIRCASE.upFraction));
    return clampStretch(Math.max(longer, current + STAIRCASE.minStepUpSeconds));
  }
  return clampStretch(current * (1 - STAIRCASE.downFraction));
}
