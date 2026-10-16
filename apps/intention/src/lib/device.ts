import { createStorage, storageKey } from '@micro/platform';
import { appConfig } from '../../app.config.ts';

const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';
const DEVICE_KEY = storageKey(appConfig.name, 'device');
const PATTERN = /^[a-z0-9]{12,64}$/;

/** A random, unguessable id: 20 characters, 100 bits. 32 letters, so each byte maps with no bias. */
export function newDeviceId(): string {
  let id = '';
  for (const byte of crypto.getRandomValues(new Uint8Array(20))) id += ALPHABET[byte & 31];
  return id;
}

let cached: Promise<string> | null = null;

/**
 * This device's anonymous id, made once and kept in IndexedDB. It ties your runs together without
 * saying who you are. If storage is blocked, the id lasts for this visit only.
 */
export function getDeviceId(): Promise<string> {
  cached ??= (async () => {
    const storage = createStorage(appConfig.name);
    try {
      const saved = await storage.get<unknown>(DEVICE_KEY);
      if (typeof saved === 'string' && PATTERN.test(saved)) return saved;
    } catch {
      // Storage is blocked. Fall through to a fresh id.
    }
    const id = newDeviceId();
    try {
      await storage.set(DEVICE_KEY, id);
    } catch {
      // Kept in memory for this visit.
    }
    return id;
  })();
  return cached;
}
