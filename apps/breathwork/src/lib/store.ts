import { createStorage, storageKey } from '@micro/platform';
import { appConfig } from '../../app.config.ts';
import { sanitizeSavedPatterns, type CustomPattern } from './custom';
import { addRecord, sanitizeHistory, type SessionRecord } from './history';
import { sanitizeSettings, type Settings } from './settings';
import { sanitizeUnlock, type SavedUnlock } from './unlock';

// IndexedDB can be missing or blocked (some private modes). The app still works then;
// it only forgets its settings between visits.
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
const PATTERNS_KEY = storageKey(appConfig.name, 'patterns');

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

export async function loadHistory(): Promise<SessionRecord[]> {
  try {
    return sanitizeHistory(await storage.get<unknown>(HISTORY_KEY));
  } catch {
    return [];
  }
}

/** Adds a finished session and drops ones older than the privacy page promises to keep. */
export async function recordSession(record: SessionRecord): Promise<void> {
  try {
    await storage.set(HISTORY_KEY, addRecord(await loadHistory(), record, Date.now()));
  } catch {
    // History is a convenience. Losing one entry is better than breaking the session.
  }
}

export async function loadSavedPatterns(): Promise<CustomPattern[]> {
  try {
    return sanitizeSavedPatterns(await storage.get<unknown>(PATTERNS_KEY));
  } catch {
    return [];
  }
}

export async function saveSavedPatterns(patterns: readonly CustomPattern[]): Promise<void> {
  try {
    await storage.set(PATTERNS_KEY, patterns);
  } catch {
    // The list stays in memory for this visit.
  }
}
