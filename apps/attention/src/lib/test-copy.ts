import type { PracticeFeedback } from './sart-score';

export const PRACTICE_FEEDBACK: Record<PracticeFeedback, string> = {
  correct: 'Correct',
  tappedThree: "That was a 3, don't tap",
  missed: 'Tap for every number except 3',
};

export const PHONE_TIMING_NOTE =
  'Phone screens add small timing delays, so your times are best compared with your own earlier results.';

export const PRACTICE_EFFECT_NOTE =
  'Scores usually rise a little on a second test just from practice. Compare with your first few results, not just the last one.';
