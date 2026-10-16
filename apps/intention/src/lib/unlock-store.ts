import { createStorage, storageKey } from '@micro/platform';
import { normalizeCode } from '@micro/payments/unlock-codes';
import { appConfig } from '../../app.config.ts';

// IndexedDB can be missing or blocked (some private modes). Then the code works for this visit only,
// and can be entered again on the restore page.
const storage = createStorage(appConfig.name);
const UNLOCK_KEY = storageKey(appConfig.name, 'unlock');

/** The Lab Pass unlock code saved on this device, or null. */
export async function loadUnlockCode(): Promise<string | null> {
  try {
    const saved = await storage.get<unknown>(UNLOCK_KEY);
    return typeof saved === 'string' && normalizeCode(saved) ? saved : null;
  } catch {
    return null;
  }
}

export async function saveUnlockCode(code: string): Promise<void> {
  try {
    await storage.set(UNLOCK_KEY, code);
  } catch {
    // Kept for this visit.
  }
}
