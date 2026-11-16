import { createPassState, DEVICE_HEADER, PASS_HEADER } from '@micro/payments/pass';
import { UNLOCK_HEADER } from '@micro/payments/unlock-codes';
import { createStorage } from '@micro/platform';
import { appConfig } from '../../app.config.ts';
import { loadUnlock } from './store.ts';

/**
 * What this device can show the server: its Personality unlock code, kept as `personality:unlock`, and an
 * all-app pass, kept as `personality:pass`. Either one opens every full report, every couple report and the
 * Big Five report. The server checks them on every request before it sends paid text; the device never decides.
 */
export const pass = createPassState({
  app: appConfig.name,
  storage: createStorage(appConfig.name),
  baseUrl: import.meta.env.BASE_URL,
});

/** Headers that carry this device's unlock code and pass, with its anonymous device id. Empty with neither. */
export async function accessHeaders(): Promise<Record<string, string>> {
  await pass.start();
  const [unlock, deviceId] = await Promise.all([loadUnlock(), pass.deviceId()]);
  const passCode = pass.isActive() ? pass.code() : null;
  const headers: Record<string, string> = {};
  if (unlock) headers[UNLOCK_HEADER] = unlock.code;
  if (passCode) headers[PASS_HEADER] = passCode;
  if (unlock || passCode) headers[DEVICE_HEADER] = deviceId;
  return headers;
}
