import { createPassState } from '@micro/payments/pass';
import { createStorage } from '@micro/platform';
import { appConfig } from '../../app.config.ts';

/**
 * The pass on this device, kept as `pass:pass` in this site's storage. The landing page reads the same
 * key to open apps with a one-time token. Apps never read it: each keeps its own copy.
 */
export const pass = createPassState({
  app: appConfig.name,
  storage: createStorage(appConfig.name),
  baseUrl: import.meta.env.BASE_URL,
});
