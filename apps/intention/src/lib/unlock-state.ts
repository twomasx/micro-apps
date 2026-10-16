import { checkCode } from './api.ts';
import { refreshUnlock } from './unlock.ts';
import { loadUnlock, saveUnlock } from './unlock-store.ts';

/**
 * Whether this device has Lab Pass, for the whole app. Only the server decides: the saved code is checked
 * with it on each visit, a code becomes saved only after the server confirmed a payment or the code, and
 * every request that Lab Pass changes is checked again on the server.
 */
let unlocked = false;
const listeners = new Set<() => void>();

function set(value: boolean) {
  if (value === unlocked) return;
  unlocked = value;
  for (const listener of listeners) listener();
}

export function isUnlocked(): boolean {
  return unlocked;
}

export function subscribeUnlocked(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

let started = false;

/** Once per page load: use the saved answer at once, then ask the server. */
export function startUnlockCheck(): void {
  if (started) return;
  started = true;
  void refreshUnlock({
    load: loadUnlock,
    save: saveUnlock,
    check: checkCode,
    online: () => navigator.onLine,
    now: () => Date.now(),
    apply: set,
  });
}

/** After the server confirmed a payment or a code. */
export async function unlockWithCode(code: string): Promise<void> {
  await saveUnlock({ code, valid: true, checkedAt: Date.now() });
  set(true);
}
