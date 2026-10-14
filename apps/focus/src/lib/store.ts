import { createStorage, storageKey } from '@micro/platform';
import { appConfig } from '../../app.config.ts';
import { addEntry, sanitizeHistory, type HistoryEntry } from './history';
import { sanitizeSettings, type Settings } from './settings';
import { sanitizeUnlock, type SavedUnlock } from './unlock';

// IndexedDB can be missing or blocked (some private modes). The player still
// works then; it only forgets its settings between visits.
const storage = createStorage(appConfig.name);
const SETTINGS_KEY = storageKey(appConfig.name, 'settings');

export async function loadSettings(): Promise<Settings> {
  try {
    return sanitizeSettings(await storage.get<unknown>(SETTINGS_KEY));
  } catch {
    return sanitizeSettings(undefined);
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  try {
    await storage.set(SETTINGS_KEY, settings);
  } catch {
    // Nothing to do: the settings stay in memory for this visit.
  }
}

const UNLOCK_KEY = storageKey(appConfig.name, 'unlock');
const HISTORY_KEY = storageKey(appConfig.name, 'history');

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

export async function loadHistory(): Promise<HistoryEntry[]> {
  try {
    return sanitizeHistory(await storage.get<unknown>(HISTORY_KEY));
  } catch {
    return [];
  }
}

export async function recordSession(entry: HistoryEntry): Promise<void> {
  try {
    await storage.set(HISTORY_KEY, addEntry(await loadHistory(), entry));
  } catch {
    // History is a convenience. Losing one entry is better than breaking the player.
  }
}
