/**
 * Payment settings that differ between environments. Read by every app's functions.
 * Import from '@micro/payments/settings': it pulls in nothing else, so the browser can use the types too.
 */

/** Stripe's two worlds. A purchase made in one never unlocks anything in the other. */
export type PaymentsMode = 'test' | 'live';

/** Where a deployment runs. Only staging shows the TEST MODE label. */
export type DeployEnvironment = 'staging' | 'production' | 'local';

export interface PaymentsSettings {
  /** The kill switch. When false, checkout is closed and existing unlocks keep working. */
  enabled: boolean;
  mode: PaymentsMode;
  environment: DeployEnvironment;
}

export interface PaymentsEnv {
  /** Exactly "true" opens checkout. Anything else, including a missing value, keeps it closed. */
  PAYMENTS_ENABLED?: string;
  /** "test" or "live". */
  PAYMENTS_MODE?: string;
  /** "staging", "production" or "local". */
  ENVIRONMENT?: string;
}

/** What the client learns from GET api/payments. */
export interface PaymentsStatus {
  enabled: boolean;
  mode: PaymentsMode;
  environment: DeployEnvironment;
}

export function parseMode(value: string | undefined): PaymentsMode {
  if (value === 'test' || value === 'live') return value;
  throw new Error('PAYMENTS_MODE must be "test" or "live"');
}

/**
 * Reads the settings. A missing or unknown mode throws, so a deployment that forgot it
 * fails loudly instead of guessing. The kill switch fails closed.
 */
export function readSettings(env: PaymentsEnv): PaymentsSettings {
  const environment = env.ENVIRONMENT;
  return {
    enabled: env.PAYMENTS_ENABLED === 'true',
    mode: parseMode(env.PAYMENTS_MODE),
    environment: environment === 'staging' || environment === 'production' ? environment : 'local',
  };
}

/** The Stripe secret key must belong to the mode, so a test key can never run in live mode or the reverse. */
export function assertKeyMatchesMode(secretKey: string, mode: PaymentsMode): void {
  const prefix = mode === 'live' ? 'sk_live_' : 'sk_test_';
  if (!secretKey.startsWith(prefix)) {
    throw new Error(`PAYMENTS_MODE is ${mode}, so the Stripe secret key must start with ${prefix}`);
  }
}

/** The body of GET api/payments. */
export function paymentsStatus(settings: PaymentsSettings): PaymentsStatus {
  return { enabled: settings.enabled, mode: settings.mode, environment: settings.environment };
}

/** What checkout answers while the kill switch is off. */
export function paymentsClosed(): Response {
  return Response.json(
    { error: 'payments_closed', message: 'Unlocks open soon.' },
    { status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '3600' } },
  );
}
