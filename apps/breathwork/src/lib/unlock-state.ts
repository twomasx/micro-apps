import { checkCode } from './api';
import { pass } from './pass-state';
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

/** This app's own lifetime unlock, as opposed to the all-app pass. */
let own = false;

/** Unlocked with this app's own purchase or with an active all-app pass. */
function publish() {
  const next = own || pass.isActive() || devUnlocked();
  if (next === unlocked) return;
  unlocked = next;
  for (const listener of listeners) listener();
}

function set(value: boolean) {
  own = value;
  publish();
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
  pass.subscribe(publish);
  void pass.start();
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
