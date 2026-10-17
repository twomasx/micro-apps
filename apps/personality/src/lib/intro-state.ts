import { looksLikeResultId } from './compare.ts';
import { answeredCount, restoreProgress } from './progress.ts';
import { CURRENT_VERSION, currentQuestions } from './questions.ts';
import {
  clearCompareWith,
  loadCompareWith,
  loadProgress,
  loadResults,
  saveCompareWith,
  type SavedResult,
} from './store.ts';

/** What the intro shows from this device: a test under way, the last result, a compare link. */
export interface IntroState {
  answered: number;
  lastResult: SavedResult | undefined;
  /** The result someone asked you to compare with. */
  compareWith: string | null;
  /** True when the compare link in the address is your own result's. */
  ownLink: boolean;
}

/** `withId` is the result in a compare link, `?with=<id>`. */
export async function loadIntroState(withId: string | null): Promise<IntroState> {
  const progress = restoreProgress(await loadProgress(CURRENT_VERSION), currentQuestions);
  const results = await loadResults();
  const answered = progress ? answeredCount(progress) : 0;

  const linked = looksLikeResultId(withId) ? withId : null;
  const ownLink = linked !== null && results.some((saved) => saved.id === linked);
  if (linked && !ownLink) {
    // Remembered until the test is submitted, which then opens the comparison.
    await saveCompareWith(linked);
  } else if (answered === 0) {
    // No link and no test under way: an old compare link should not come back later.
    await clearCompareWith();
  }

  return {
    answered,
    lastResult: results.at(-1),
    compareWith: ownLink ? null : await loadCompareWith(),
    ownLink,
  };
}

/**
 * The intro's state, read before the app's first render when the app opens on the intro (see main.tsx).
 * The saved state lives in IndexedDB, which answers only after a render. Without this, a returning visitor
 * would see "Start the test" for a moment before "Continue the test" or "Your last result" came in. A first
 * visit reads an empty state and draws the same screen as the page the server sent.
 */
let early: { withId: string | null; state: IntroState } | null = null;

/** Never holds the app back longer than this: a slow or stuck IndexedDB falls back to the old behavior. */
const PRELOAD_LIMIT_MS = 300;

export async function preloadIntroState(withId: string | null): Promise<void> {
  const state = await Promise.race([
    loadIntroState(withId).catch(() => null),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), PRELOAD_LIMIT_MS)),
  ]);
  if (state) early = { withId, state };
}

/** The preloaded state for this compare link, if it is still fresh. */
export function earlyIntroState(withId: string | null): IntroState | undefined {
  return early !== null && early.withId === withId ? early.state : undefined;
}

/** Called once the intro is on screen: later visits to the intro read the device again. */
export function forgetEarlyIntroState(): void {
  early = null;
}
