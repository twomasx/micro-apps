import { checkCode } from './api';
import { loadUnlock, saveUnlock } from './store';
import { refreshUnlock } from './unlock';

/**
 * Whether this device has the lifetime unlock, for the whole app. Only the server decides:
 * the saved code is checked with it on each visit, and a code becomes saved only after the
 * server confirmed a payment or the code.
 */
let unlocked = devUnlocked();
const listeners = new Set<() => void>();

/** In dev only, ?unlocked shows the app as it is after the lifetime unlock. Real unlocks come from the server. */
function devUnlocked(): boolean {
  return import.meta.env.DEV && typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('unlocked');
}

function set(value: boolean) {
  const next = value || devUnlocked();
  if (next === unlocked) return;
  unlocked = next;
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
