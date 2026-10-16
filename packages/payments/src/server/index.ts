/** Server-side payments for the apps' Pages Functions. Import from '@micro/payments/server'. */
export { error, isRecord, json, randomId, readJson, SESSION_ID_PATTERN } from './http';
export { writeLog, type LogAction, type LogEntry } from './log';
export { confirmPurchase, handleStripeWebhook, startCheckout, type PaymentsContext } from './purchases';
export {
  PASS_CODES,
  purchaseStore,
  UNLOCK_CODES,
  type CodeScheme,
  type PurchaseRow,
  type PurchaseStatus,
  type PurchaseStore,
  type StoreOptions,
} from './store';
export { unlockRoutes, type UnlockAppConfig, type UnlockRoutes } from './unlock-routes';
export { CLIENT_IP_HEADER, requestHasPass, SERVICE_KEY_HEADER, type ServerPassOptions } from './pass-check';
export {
  addressHash,
  clientAddress,
  countTry,
  deviceIdOf,
  DEVICE_LIMIT,
  noteAddress,
  PER_DAY,
  PER_MINUTE,
  tooManyTries,
  admitDevice,
  type RateAnswer,
} from './guard';
