interface Env {
  DB: D1Database;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  /** At least 32 random characters. Unlock codes are made from it, so never change it once codes exist. */
  UNLOCK_CODE_SECRET: string;
  /** Where the site is served, like https://polymadlabs.com. Checkout sends buyers back here. */
  PUBLIC_ORIGIN?: string;
  /** The kill switch: exactly "true" opens checkout. A secret, so it can be flipped without a code change. */
  PAYMENTS_ENABLED?: string;
  /** "test" or "live". Set in wrangler.jsonc for each environment. */
  PAYMENTS_MODE?: string;
  /** "staging" or "production". Set in wrangler.jsonc. Missing means local. */
  ENVIRONMENT?: string;
  /** The pass service for this environment, like https://polymadlabs.com. Set in wrangler.jsonc. */
  PASS_API_ORIGIN?: string;
  /** Shared with the router of this environment, so the visitor address it passes on can be trusted. */
  ROUTER_KEY?: string;
}
