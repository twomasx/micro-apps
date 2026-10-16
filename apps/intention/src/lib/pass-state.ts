import { createPassState, DEVICE_HEADER, PASS_HEADER } from '@micro/payments/pass';
import { createStorage } from '@micro/platform';
import { appConfig } from '../../app.config.ts';

/**
 * The all-app pass on this device, kept as `intention:pass` in this app's own storage. The pass service is asked,
 * never shared storage, so this keeps working if the app moves to its own domain.
 */
export const pass = createPassState({
  app: appConfig.name,
  storage: createStorage(appConfig.name),
  baseUrl: import.meta.env.BASE_URL,
});

/**
 * Headers that carry an active all-app pass to the server, which checks it with the pass service before
 * it gives Lab Pass features. Empty without a pass.
 */
export function passHeaders(deviceId: string): Record<string, string> {
  const code = pass.isActive() ? pass.code() : null;
  return code ? { [PASS_HEADER]: code, [DEVICE_HEADER]: deviceId } : {};
}
