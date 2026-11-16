// The shared copy lives in packages/payments, so every app treats saved codes the same way.
export * from '@micro/payments/saved-unlock';
import { saveUnlock } from './store.ts';

/** Keeps a code the server accepted on this device. Every later request carries it. */
export async function unlockWithCode(code: string): Promise<void> {
  await saveUnlock({ code, valid: true, checkedAt: Date.now() });
}

/** What the one-time unlock opens. Shown on the unlock page and wherever it is offered. */
export const UNLOCK_ADDS = [
  'The full report for every four-letter result: each percentage explained, the type in depth, and the Big Five traits behind it.',
  'The full Big Five report: all ten aspects, two for each trait, with a longer read on each trait.',
  'Every couple report, for both tests, with questions to talk through.',
  'Any test we add to Personality later.',
];

export const SAVE_CODE_LINE =
  'Save this code. It unlocks Personality on up to 5 devices, and it is the only way to restore your purchase. We do not keep your email.';
