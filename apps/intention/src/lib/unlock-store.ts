import { createStorage, storageKey } from '@micro/platform';
import { appConfig } from '../../app.config.ts';
import { sanitizeUnlock, type SavedUnlock } from './unlock.ts';

// IndexedDB can be missing or blocked (some private modes). Then Lab Pass works for this visit only,
// and the code can be entered again on the restore page.
const storage = createStorage(appConfig.name);
const UNLOCK_KEY = storageKey(appConfig.name, 'unlock');

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
    // Kept for this visit.
  }
}

/**
 * The saved Lab Pass code, sent with requests that Lab Pass changes (longer runs, no daily limit, your full
 * history). The server checks it every time; the device never decides on its own.
 */
export async function loadUnlockCode(): Promise<string | null> {
  return (await loadUnlock())?.code ?? null;
}
