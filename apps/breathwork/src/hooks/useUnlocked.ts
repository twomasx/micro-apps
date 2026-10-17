import { useSyncExternalStore } from 'react';
import { isUnlocked, subscribeUnlocked } from '../lib/unlock-state';

/** True once the server has confirmed this device's unlock. */
export function useUnlocked(): boolean {
  // Pages rendered at build time show the free version; the device's unlock applies once the app starts.
  return useSyncExternalStore(subscribeUnlocked, isUnlocked, () => false);
}
