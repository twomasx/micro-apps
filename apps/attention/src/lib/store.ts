import { createStorage, storageKey } from '@micro/platform';
import { appConfig } from '../../app.config.ts';
import { sanitizeSessions } from './history';
import type { SessionRecord, TestRecord } from './records';
import { sanitizeSettings, type Settings } from './settings';
import { sanitizeTests } from './tests';
import { sanitizeUnlock, type SavedUnlock } from './unlock';

// IndexedDB can be missing or blocked (some private modes). The app still works then;
// it only forgets between visits.
const storage = createStorage(appConfig.name);
const SETTINGS_KEY = storageKey(appConfig.name, 'settings');
const SESSIONS_KEY = storageKey(appConfig.name, 'sessions');
const TESTS_KEY = storageKey(appConfig.name, 'tests');
const UNLOCK_KEY = storageKey(appConfig.name, 'unlock');

export async function loadSettings(): Promise<Settings> {
  try {
    return sanitizeSettings(await storage.get<unknown>(SETTINGS_KEY));
  } catch {
    return sanitizeSettings(undefined);
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  rememberSavedData();
  try {
    await storage.set(SETTINGS_KEY, settings);
  } catch {
    // The settings stay in memory for this visit.
  }
}

export async function loadSessions(): Promise<SessionRecord[]> {
  try {
    return sanitizeSessions(await storage.get<unknown>(SESSIONS_KEY));
  } catch {
    return [];
  }
}

export async function saveSessions(sessions: readonly SessionRecord[]): Promise<void> {
  rememberSavedData();
  try {
    await storage.set(SESSIONS_KEY, sessions);
  } catch {
    // The sessions stay in memory for this visit.
  }
}

export async function loadTests(): Promise<TestRecord[]> {
  try {
    return sanitizeTests(await storage.get<unknown>(TESTS_KEY));
  } catch {
    return [];
  }
}

export async function saveTests(tests: readonly TestRecord[]): Promise<void> {
  rememberSavedData();
  try {
    await storage.set(TESTS_KEY, tests);
  } catch {
    // The results stay in memory for this visit.
  }
}

/**
 * A one-word note that this device has saved settings, sessions or results, readable before the first render.
 * The records live in IndexedDB, which answers only after the page has drawn. The page the server sends shows
 * a first visit's Today, so a first visit draws it once and keeps it; this note makes a returning visitor's
 * first render wait for their own records instead of showing the first-visit screen.
 */
const SAVED_DATA_KEY = storageKey(appConfig.name, 'has-data');

export function savedDataHint(): boolean {
  try {
    return typeof window !== 'undefined' && window.localStorage.getItem(SAVED_DATA_KEY) === '1';
  } catch {
    return false;
  }
}

export function rememberSavedData(): void {
  try {
    window.localStorage.setItem(SAVED_DATA_KEY, '1');
  } catch {
    // Storage is blocked. The next visit may show the first-visit screen for a moment, as before.
  }
}

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
