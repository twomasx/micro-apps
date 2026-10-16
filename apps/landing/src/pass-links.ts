/**
 * If this browser has a PolymadLabs pass (saved by the pass pages under polymadlabs.com/pass/), opening an app
 * from this page carries the pass along with a one-time token, so the app unlocks with no typing.
 * Without a pass, links work as plain links. The landing page and the pass both live on polymadlabs.com
 * for good, so reading the pass pages' storage here is safe. The apps never do: they ask the pass service.
 */

interface SavedPass {
  code: string;
  status: string;
  lastGoodAt: number;
}

const OFFLINE_GRACE_MS = 7 * 24 * 60 * 60 * 1000;

/** The pass saved by the pass pages, or null. Never creates the pass pages' database if it does not exist. */
export function readSavedPass(idb: IDBFactory = indexedDB): Promise<SavedPass | null> {
  return new Promise((resolve) => {
    let request: IDBOpenDBRequest;
    try {
      request = idb.open('pass');
    } catch {
      resolve(null);
      return;
    }
    // A new database means there is no pass. Abort so this page does not create it empty.
    request.onupgradeneeded = () => request.transaction?.abort();
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
    request.onsuccess = () => {
      const db = request.result;
      try {
        const get = db.transaction('kv', 'readonly').objectStore('kv').get('pass:pass');
        get.onsuccess = () => {
          db.close();
          const value = get.result as Partial<SavedPass> | undefined;
          resolve(typeof value?.code === 'string' ? { code: value.code, status: String(value.status), lastGoodAt: Number(value.lastGoodAt) } : null);
        };
        get.onerror = () => {
          db.close();
          resolve(null);
        };
      } catch {
        db.close();
        resolve(null);
      }
    };
  });
}

export function isUsable(pass: SavedPass | null, now: number): pass is SavedPass {
  return pass !== null && pass.status === 'active' && now - pass.lastGoodAt <= OFFLINE_GRACE_MS;
}

/** Asks the pass service for a one-time token. */
async function token(code: string): Promise<string> {
  const response = await fetch('/pass/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`token: ${response.status}`);
  return ((await response.json()) as { token: string }).token;
}

/** Opens app links with the pass. `paths` are the apps' paths, like '/focus/'. */
export function openAppsWithPass(doc: Document, paths: readonly string[]): void {
  doc.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = (event.target as Element | null)?.closest?.('a[href]');
    if (!(link instanceof HTMLAnchorElement) || link.origin !== window.location.origin || !paths.includes(link.pathname)) return;
    event.preventDefault();
    const href = link.href;
    void readSavedPass()
      .then((pass) => (isUsable(pass, Date.now()) ? token(pass.code) : null))
      .then(
        (value) => {
          const url = new URL(href);
          if (value) url.searchParams.set('passToken', value);
          window.location.assign(url.href);
        },
        () => window.location.assign(href),
      );
  });
}
