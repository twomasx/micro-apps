import { storageKey } from '@micro/platform';
import { appConfig } from '../../app.config.ts';
import { pass } from './pass-state';

/** Read by public/pass-hint.js before the first paint. Keep the key in step with that file. */
const HINT_KEY = storageKey(appConfig.name, 'has-pass');

/** The longest the offer stays hidden while the saved pass loads, in case it never answers. */
const HIDE_AT_MOST_MS = 1500;

function remember(active: boolean): void {
  try {
    if (active) window.localStorage.setItem(HINT_KEY, '1');
    else window.localStorage.removeItem(HINT_KEY);
  } catch {
    // Storage is blocked: the offer may show first next time.
  }
}

/** Shows the page as it really is: the offer again if the pass turned out to be gone. */
function release(): void {
  delete document.documentElement.dataset.passHint;
}

/** Keeps the before-paint flag true to the saved pass, and never hides the offer for long. */
export function syncPassHint(): void {
  pass.subscribe(() => remember(pass.isActive()));
  void pass.start().then(() => {
    remember(pass.isActive());
    release();
  });
  window.setTimeout(release, HIDE_AT_MOST_MS);
}
