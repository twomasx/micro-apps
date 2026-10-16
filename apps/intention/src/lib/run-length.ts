import { createStorage, storageKey } from '@micro/platform';
import { appConfig } from '../../app.config.ts';
import { RUN_SECONDS, STANDARD_SECONDS, type RunSeconds } from './protocol.ts';

/** The run length picked on this device. Longer runs need Lab Pass; the server checks. */
const storage = createStorage(appConfig.name);
const LENGTH_KEY = storageKey(appConfig.name, 'length');

export function sanitizeLength(value: unknown): RunSeconds {
  return RUN_SECONDS.includes(value as RunSeconds) ? (value as RunSeconds) : STANDARD_SECONDS;
}

/** Without Lab Pass every run is the standard length, whatever was saved. */
export function effectiveLength(saved: RunSeconds, labPass: boolean): RunSeconds {
  return labPass ? saved : STANDARD_SECONDS;
}

export async function loadLength(): Promise<RunSeconds> {
  try {
    return sanitizeLength(await storage.get<unknown>(LENGTH_KEY));
  } catch {
    return STANDARD_SECONDS;
  }
}

export async function saveLength(seconds: RunSeconds): Promise<void> {
  try {
    await storage.set(LENGTH_KEY, seconds);
  } catch {
    // Kept for this visit.
  }
}
