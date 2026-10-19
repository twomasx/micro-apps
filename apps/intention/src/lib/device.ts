import { pass } from './pass-state.ts';

/**
 * This device's anonymous id, made once and kept in IndexedDB as `intention:device`. It ties your runs together
 * without saying who you are. If storage is blocked, the id lasts for this visit only.
 *
 * The same id the all-app pass and unlock code checks send, from the one place that makes it, so a first visit
 * can never make two ids and use two of a code's 5 device places on one phone.
 */
export function getDeviceId(): Promise<string> {
  return pass.deviceId();
}
