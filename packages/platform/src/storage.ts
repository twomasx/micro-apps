import { openDB, type IDBPDatabase } from 'idb';

const STORE = 'kv';

export interface AppStorage {
  get<T>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

/** All five apps share one origin, so every browser storage key carries the app name. */
export function storageKey(appName: string, key: string): string {
  return `${appName}:${key}`;
}

/** Key-value store on IndexedDB. The database is named after the app. */
export function createStorage(appName: string): AppStorage {
  let db: Promise<IDBPDatabase> | undefined;
  const open = () =>
    (db ??= openDB(appName, 1, {
      upgrade(database) {
        database.createObjectStore(STORE);
      },
    }));

  return {
    async get<T>(key: string) {
      return (await (await open()).get(STORE, key)) as T | undefined;
    },
    async set(key, value) {
      await (await open()).put(STORE, value, key);
    },
    async delete(key) {
      await (await open()).delete(STORE, key);
    },
    async clear() {
      await (await open()).clear(STORE);
    },
  };
}
