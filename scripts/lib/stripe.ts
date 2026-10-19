import { assertKeyMatchesMode, keyMode, type PaymentsMode } from '@micro/payments/settings';
import Stripe from 'stripe';

/**
 * A Stripe client for the given mode. The key comes from an environment variable, never from a file in the repo
 * or an argument (arguments end up in shell history).
 */
export function stripeFor(mode: PaymentsMode, variable = 'STRIPE_SECRET_KEY'): Stripe {
  const key = process.env[variable];
  if (!key) {
    throw new Error(`Set ${variable} first, for example: export ${variable}=$(grep '^STRIPE_SECRET_KEY=' apps/focus/.env | cut -d= -f2-)`);
  }
  assertKeyMatchesMode(key, mode);
  return new Stripe(key);
}

export function modeFromArgs(args: string[]): PaymentsMode {
  return args.includes('--live') ? 'live' : 'test';
}

/** The mode of the key in STRIPE_SECRET_KEY, for scripts that read whichever mode the key belongs to. */
export function modeFromKey(): PaymentsMode {
  return keyMode(process.env.STRIPE_SECRET_KEY ?? '') === 'live' ? 'live' : 'test';
}

/**
 * Which environment a webhook origin belongs to. Test-mode webhooks point at staging only, and live-mode
 * webhooks at production only, so a test card can never unlock anything on the public site and a real
 * payment never lands in a staging database.
 */
export function webhookEnvironment(origin: string, mode: PaymentsMode): 'staging' | 'production' {
  const environment = new URL(origin).hostname.startsWith('staging.') ? 'staging' : 'production';
  if (mode === 'test' && environment === 'production') {
    throw new Error('Test-mode webhooks point at staging only. Production gets live-mode webhooks at go-live.');
  }
  if (mode === 'live' && environment === 'staging') {
    throw new Error('Live-mode webhooks point at production only. Staging stays in test mode.');
  }
  return environment;
}

/** The value after a flag: `--from 2026-10-01` */
export function flag(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}
