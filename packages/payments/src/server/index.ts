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
  CODE_CHECKS,
  forgetOldRecords,
  refuseOverLimit,
  ROUTER_KEY_HEADER,
  VISITOR_IP_HEADER,
  countTry,
  deviceIdOf,
  DEVICE_LIMIT,
  noteAddress,
  PER_DAY,
  PER_MINUTE,
  tooManyTries,
  admitDevice,
  type AddressLimit,
  type RateAnswer,
  type RateLimits,
} from './guard';
