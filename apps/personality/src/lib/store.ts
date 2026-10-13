import { createStorage, storageKey } from '@micro/platform';
import { appConfig } from '../../app.config.ts';
import type { Progress } from './progress.ts';

// IndexedDB can be missing or blocked (some private modes). The test still
// works then; it only loses resume and "Your last result".
const storage = createStorage(appConfig.name);

const RESULTS_KEY = storageKey(appConfig.name, 'results');
const COMPARE_WITH_KEY = storageKey(appConfig.name, 'compare-with');

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
export async function loadCompareWith(): Promise<string | null> {
  try {
    return (await storage.get<string>(COMPARE_WITH_KEY)) ?? null;
  } catch {
    return null;
  }
}

export async function saveCompareWith(resultId: string): Promise<void> {
  try {
    await storage.set(COMPARE_WITH_KEY, resultId);
  } catch {
    // See saveProgress. The test still works; it ends on the plain result.
  }
}

export async function clearCompareWith(): Promise<void> {
  try {
    await storage.delete(COMPARE_WITH_KEY);
  } catch {
    // See saveProgress.
  }
}
