import { createStorage, storageKey } from '@micro/platform';
import { appConfig } from '../../app.config.ts';
import { sanitizeSessions } from './history';
import type { SessionRecord } from './records';
import { sanitizeSettings, type Settings } from './settings';

// IndexedDB can be missing or blocked (some private modes). The app still works then;
// it only forgets between visits.
const storage = createStorage(appConfig.name);
const SETTINGS_KEY = storageKey(appConfig.name, 'settings');
const SESSIONS_KEY = storageKey(appConfig.name, 'sessions');

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
  try {
    await storage.set(SESSIONS_KEY, sessions);
  } catch {
    // The sessions stay in memory for this visit.
  }
}
