import { createPassState } from '@micro/payments/pass';
import { createStorage } from '@micro/platform';
import { appConfig } from '../../app.config.ts';

/**
 * The all-app pass on this device, kept as `attention:pass` in this app's own storage. The pass service is asked,
 * never shared storage, so this keeps working if the app moves to its own domain.
 */
export const pass = createPassState({
  app: appConfig.name,
  storage: createStorage(appConfig.name),
  baseUrl: import.meta.env.BASE_URL,
});
