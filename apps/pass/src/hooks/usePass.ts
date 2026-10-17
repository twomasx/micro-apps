import { useSyncExternalStore } from 'react';
import { pass } from '../lib/pass-state';

const noPass = () => false;

/** The pass saved on this device and whether it is active now. At build time there is no device, so no pass. */
export function usePass(): { active: boolean; code: string | null } {
  const active = useSyncExternalStore(pass.subscribe, pass.isActive, noPass);
  return { active, code: active ? pass.code() : null };
}
