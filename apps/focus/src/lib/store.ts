import { createStorage, storageKey } from '@micro/platform';
import { appConfig } from '../../app.config.ts';
import { sanitizeSettings, type Settings } from './settings';

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
