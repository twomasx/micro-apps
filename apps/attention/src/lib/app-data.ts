import { upsertSession } from './history';
import type { SessionRecord, TestRecord } from './records';
import { DEFAULT_SETTINGS, type Settings } from './settings';
import { loadSessions, loadSettings, saveSessions, saveSettings } from './store';

/** Everything the screens read, loaded once from this device and kept in memory. */
export interface AppData {
  loaded: boolean;
  settings: Settings;
  sessions: SessionRecord[];
  tests: TestRecord[];
}

let data: AppData = { loaded: false, settings: DEFAULT_SETTINGS, sessions: [], tests: [] };
const listeners = new Set<() => void>();
let loading: Promise<void> | null = null;

function set(next: AppData) {
  data = next;
  for (const listener of listeners) listener();
}

export function getAppData(): AppData {
  return data;
}

export function subscribeAppData(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function loadAppData(): Promise<void> {
  loading ??= Promise.all([loadSettings(), loadSessions()]).then(([settings, sessions]) => {
    set({ ...data, loaded: true, settings, sessions });
  });
  return loading;
}

export function updateSettings(patch: Partial<Settings>): void {
  const settings = { ...data.settings, ...patch };
  set({ ...data, settings });
  void saveSettings(settings);
}

/** Saves a session, or the newer copy of one in progress. */
export function saveSession(record: SessionRecord): void {
  const sessions = upsertSession(data.sessions, record);
  set({ ...data, sessions });
  void saveSessions(sessions);
}
