import { assertKeyMatchesMode, type PaymentsMode } from '@micro/payments/settings';
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

/** The value after a flag: `--from 2026-10-01` */
export function flag(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}
