import { useSyncExternalStore } from 'react';
import { pass } from '../lib/pass-state';

/** The pass saved on this device and whether it is active now. */
export function usePass(): { active: boolean; code: string | null } {
  const active = useSyncExternalStore(pass.subscribe, pass.isActive);
  return { active, code: active ? pass.code() : null };
}
