import { checkCode } from './api.ts';
import { pass } from './pass-state.ts';
import { refreshUnlock } from './unlock.ts';
import { loadUnlock, saveUnlock } from './unlock-store.ts';

/**
 * Whether this device has Lab Pass, for the whole app. Only the server decides: the saved code is checked
 * with it on each visit, a code becomes saved only after the server confirmed a payment or the code, and
 * every request that Lab Pass changes is checked again on the server.
 */
let unlocked = false;
/** This app's own Lab Pass, as opposed to the all-app pass. */
let own = false;
const listeners = new Set<() => void>();

/** Lab Pass is on with this app's own purchase or with an active all-app pass. */
function publish() {
  const next = own || pass.isActive();
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
