import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { createWakeLock, type ScreenWakeLock, type WakeLockStatus } from '../lib/wake-lock';

/** A wake lock for this screen, released when the screen goes away. */
export function useWakeLock(): { lock: ScreenWakeLock; status: WakeLockStatus } {
  const lock = useMemo(() => createWakeLock(), []);
  const status = useSyncExternalStore(lock.subscribe, () => lock.status, () => lock.status);
  useEffect(() => () => void lock.release(), [lock]);
  return { lock, status };
}
