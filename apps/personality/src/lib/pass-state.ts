import { createPassState, DEVICE_HEADER, PASS_HEADER } from '@micro/payments/pass';
import { createStorage } from '@micro/platform';
import { appConfig } from '../../app.config.ts';

/**
 * The all-app pass on this device, kept as `personality:pass` in this app's own storage. With an active pass,
 * every full report and couple report is unlocked. The server checks the pass itself before it sends paid text.
 */
export const pass = createPassState({
  app: appConfig.name,
  storage: createStorage(appConfig.name),
  baseUrl: import.meta.env.BASE_URL,
});

/** Headers that carry an active pass to this app's server. Empty without one. */
export async function passHeaders(): Promise<Record<string, string>> {
  await pass.start();
  const code = pass.isActive() ? pass.code() : null;
  return code ? { [PASS_HEADER]: code, [DEVICE_HEADER]: await pass.deviceId() } : {};
}
