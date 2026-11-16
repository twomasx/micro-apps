import { createStorage, storageKey } from '@micro/platform';
import { appConfig } from '../../app.config.ts';
import { sanitizeUnlock, type SavedUnlock } from '@micro/payments/saved-unlock';
import type { Progress } from './progress.ts';
import type { TestKind } from './tests.ts';

// IndexedDB can be missing or blocked (some private modes). The test still
// works then; it only loses resume and "Your last result".
const storage = createStorage(appConfig.name);

const RESULTS_KEY = storageKey(appConfig.name, 'results');
const UNLOCK_KEY = storageKey(appConfig.name, 'unlock');
const UNLOCK_BACK_KEY = storageKey(appConfig.name, 'unlock-back');

/** The four-letter test keeps the key it always had; each other test has its own. */
function compareWithKey(kind: TestKind): string {
  return storageKey(appConfig.name, kind === 'type' ? 'compare-with' : `compare-with:${kind}`);
}

function progressKey(version: string): string {
  return storageKey(appConfig.name, `progress:${version}`);
}

export interface SavedResult {
  id: string;
  version: string;
  type: string;
  deleteToken: string;
  createdAt: string;
}

export async function loadProgress(version: string): Promise<unknown> {
  try {
    return await storage.get<unknown>(progressKey(version));
  } catch {
    return undefined;
  }
}

export async function saveProgress(progress: Progress): Promise<void> {
  try {
    await storage.set(progressKey(progress.version), progress);
  } catch {
    // Nothing to do: the answers stay in memory for this visit.
  }
}

export async function clearProgress(version: string): Promise<void> {
  try {
    await storage.delete(progressKey(version));
  } catch {
    // See saveProgress.
  }
}

/** The results taken on this device, oldest first. */
export async function loadResults(): Promise<SavedResult[]> {
  try {
    return (await storage.get<SavedResult[]>(RESULTS_KEY)) ?? [];
  } catch {
    return [];
  }
}

export async function addResult(result: SavedResult): Promise<void> {
  try {
    const results = await loadResults();
    await storage.set(RESULTS_KEY, [...results.filter((saved) => saved.id !== result.id), result]);
  } catch {
    // See saveProgress.
  }
}

export async function removeResult(id: string): Promise<void> {
  try {
    const results = await loadResults();
    await storage.set(
      RESULTS_KEY,
      results.filter((saved) => saved.id !== id),
    );
  } catch {
    // See saveProgress.
  }
}

/** The result someone asked you to compare with, kept while you take the test. */
export async function loadCompareWith(kind: TestKind): Promise<string | null> {
  try {
    return (await storage.get<string>(compareWithKey(kind))) ?? null;
  } catch {
    return null;
  }
}

export async function saveCompareWith(kind: TestKind, resultId: string): Promise<void> {
  try {
    await storage.set(compareWithKey(kind), resultId);
  } catch {
    // See saveProgress. The test still works; it ends on the plain result.
  }
}

export async function clearCompareWith(kind: TestKind): Promise<void> {
  try {
    await storage.delete(compareWithKey(kind));
  } catch {
    // See saveProgress.
  }
}

/** The Personality unlock code saved on this device, or null. */
export async function loadUnlock(): Promise<SavedUnlock | null> {
  try {
    return sanitizeUnlock(await storage.get<unknown>(UNLOCK_KEY));
  } catch {
    return null;
  }
}

export async function saveUnlock(unlock: SavedUnlock): Promise<void> {
  try {
    await storage.set(UNLOCK_KEY, unlock);
  } catch {
    // The unlock still works for this visit. The code can be entered again on the restore page.
  }
}

/** The report or comparison to go back to after buying, like 'r/abc/report'. Kept across the trip to Stripe. */
export async function loadUnlockBack(): Promise<string | null> {
  try {
    return (await storage.get<string>(UNLOCK_BACK_KEY)) ?? null;
  } catch {
    return null;
  }
}

export async function saveUnlockBack(path: string | null): Promise<void> {
  try {
    if (path) await storage.set(UNLOCK_BACK_KEY, path);
    else await storage.delete(UNLOCK_BACK_KEY);
  } catch {
    // The buyer lands on the unlock page without a link back. Nothing else is lost.
  }
}
