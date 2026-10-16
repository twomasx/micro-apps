import { useSyncExternalStore } from 'react';
import { isUnlocked, subscribeUnlocked } from '../lib/unlock-state.ts';

/** True once the server has confirmed this device's unlock. */
export function useUnlocked(): boolean {
  return useSyncExternalStore(subscribeUnlocked, isUnlocked);
}
