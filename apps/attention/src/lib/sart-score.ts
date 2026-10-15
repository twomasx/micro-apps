import { ANTICIPATION_MS, NO_GO_DIGIT, type SartLength as AnyLength } from './sart-sequence';

export type SartLength = Exclude<AnyLength, 'practice'>;

/** Bumped when the test or the score changes, so results from different versions aren't mixed. */
export const SART_VERSION = 1;

/** One digit as it was shown, with every tap made while it (or its mask) was on screen. */
export interface SartTrial {
  digit: number;
  size: number;
  /** Milliseconds from the digit appearing to each tap. */
  taps: number[];
}

export interface TrialOutcome {
  /** Reaction time of the response, or null when there was none. */
  rt: number | null;
  anticipations: number;
  kind: 'hit' | 'omission' | 'commission' | 'correctHold';
}

/** The first tap at 100 ms or later is the response. Earlier taps are anticipations. Later taps are ignored. */
export function scoreTrial(trial: SartTrial): TrialOutcome {
  let anticipations = 0;
  let rt: number | null = null;
  for (const tap of trial.taps) {
    if (tap < ANTICIPATION_MS) anticipations++;
    else if (rt === null) rt = tap;
  }
  const isThree = trial.digit === NO_GO_DIGIT;
  const kind = isThree ? (rt === null ? 'correctHold' : 'commission') : rt === null ? 'omission' : 'hit';
  return { rt, anticipations, kind };
}

export interface SartScore {
  version: number;
  trials: number;
  threes: number;
  /** Taps on a 3. The main SART score. */
  commissions: number;
  /** Missed taps on other digits. */
  omissions: number;
  anticipations: number;
  /** Mean reaction time on correct taps, ms. Null with no correct taps. */
  meanRt: number | null;
  /** Sample standard deviation of those reaction times, ms. */
  sdRt: number | null;
  /** sdRt / meanRt. */
  cv: number | null;
  /** 0 to 100. See DESIGN-NOTES.md and the science page. */
  score: number;
}

/** CV at or below this gets full steadiness points. */
export const CV_BEST = 0.1;
/** CV at or above this gets none. */
export const CV_WORST = 0.45;
export const SCORE_WEIGHTS = { holds: 50, hits: 25, steadiness: 25 } as const;

export function steadiness(cv: number | null): number {
  if (cv === null) return 0;
  return Math.min(1, Math.max(0, (CV_WORST - cv) / (CV_WORST - CV_BEST)));
}

export function scoreSart(trials: readonly SartTrial[]): SartScore {
  let threes = 0;
  let commissions = 0;
  let omissions = 0;
  let anticipations = 0;
  const rts: number[] = [];
  for (const trial of trials) {
    const outcome = scoreTrial(trial);
    anticipations += outcome.anticipations;
    if (trial.digit === NO_GO_DIGIT) threes++;
    if (outcome.kind === 'commission') commissions++;
    if (outcome.kind === 'omission') omissions++;
    if (outcome.kind === 'hit' && outcome.rt !== null) rts.push(outcome.rt);
  }
  const goTrials = trials.length - threes;

  const meanRt = rts.length > 0 ? rts.reduce((sum, rt) => sum + rt, 0) / rts.length : null;
  const sdRt =
    meanRt !== null && rts.length > 1
      ? Math.sqrt(rts.reduce((sum, rt) => sum + (rt - meanRt) ** 2, 0) / (rts.length - 1))
      : null;
  const cv = meanRt !== null && sdRt !== null && meanRt > 0 ? sdRt / meanRt : null;

  const holdShare = threes > 0 ? 1 - commissions / threes : 1;
  const hitShare = goTrials > 0 ? 1 - omissions / goTrials : 1;
  const score = Math.round(
    SCORE_WEIGHTS.holds * holdShare + SCORE_WEIGHTS.hits * hitShare + SCORE_WEIGHTS.steadiness * steadiness(cv),
  );

  return {
    version: SART_VERSION,
    trials: trials.length,
    threes,
    commissions,
    omissions,
    anticipations,
    meanRt: meanRt === null ? null : Math.round(meanRt),
    sdRt: sdRt === null ? null : Math.round(sdRt),
    cv: cv === null ? null : Math.round(cv * 1000) / 1000,
    score,
  };
}

export type PracticeFeedback = 'correct' | 'tappedThree' | 'missed';

/** Feedback after each practice digit. */
export function practiceFeedback(trial: SartTrial): PracticeFeedback {
  const { kind } = scoreTrial(trial);
  if (kind === 'commission') return 'tappedThree';
  if (kind === 'omission') return 'missed';
  return 'correct';
}
