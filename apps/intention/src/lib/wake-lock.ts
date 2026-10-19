/**
 * Keeps the screen on during a run (Screen Wake Lock API). Released when the run ends.
 * The browser also drops the lock when the page is hidden; the run screen takes it again on return.
 * Where the API is missing or refuses, the session runs the same and the screen may dim.
 */
export type WakeLockStatus = 'unsupported' | 'off' | 'on' | 'refused';

export interface ScreenWakeLock {
  acquire(): Promise<WakeLockStatus>;
  release(): Promise<void>;
  readonly status: WakeLockStatus;
  /** Calls `listener` whenever the status changes. Returns an unsubscribe function. */
  subscribe(listener: (status: WakeLockStatus) => void): () => void;
}

interface Sentinel {
  release(): Promise<void>;
  addEventListener(type: 'release', listener: () => void): void;
}

export interface WakeLockApi {
  request(type: 'screen'): Promise<Sentinel>;
}

function browserApi(): WakeLockApi | null {
  if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return null;
  return navigator.wakeLock as WakeLockApi;
}

export function createWakeLock(api: WakeLockApi | null = browserApi()): ScreenWakeLock {
  let sentinel: Sentinel | null = null;
  let status: WakeLockStatus = api ? 'off' : 'unsupported';
  // Bumped on every acquire and release, so a slow request that lands after a release is let go.
  let generation = 0;
  const listeners = new Set<(status: WakeLockStatus) => void>();

  const lock: ScreenWakeLock = {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    get status() {
      return status;
    },
    async acquire() {
      if (!api) return status;
      if (sentinel) return status;
      const mine = ++generation;
      try {
        const next = await api.request('screen');
        if (mine !== generation) {
          await next.release().catch(() => undefined);
          return status;
        }
        sentinel = next;
        next.addEventListener('release', () => {
          if (sentinel !== next) return;
          sentinel = null;
          setStatus('off');
        });
        setStatus('on');
      } catch {
        if (mine === generation) setStatus('refused');
      }
      return status;
    },
    async release() {
      generation++;
      const current = sentinel;
      sentinel = null;
      if (api) setStatus('off');
      if (current) await current.release().catch(() => undefined);
    },
  };

  function setStatus(next: WakeLockStatus) {
    if (next === status) return;
    status = next;
    for (const listener of listeners) listener(next);
  }

  return lock;
}
