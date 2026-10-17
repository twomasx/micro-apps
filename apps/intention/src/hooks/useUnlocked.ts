import { useSyncExternalStore } from 'react';
import { isUnlocked, subscribeUnlocked } from '../lib/unlock-state.ts';

/** True once the server has confirmed this device's unlock. */
export function useUnlocked(): boolean {
  // Pages rendered at build time show the free version; the device's Lab Pass applies once the app starts.
  return useSyncExternalStore(subscribeUnlocked, isUnlocked, () => false);
}
