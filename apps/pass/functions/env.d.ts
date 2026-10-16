interface Env {
  DB: D1Database;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  /** At least 32 random characters. Pass codes are made from it, so never change it once codes exist. */
  PASS_CODE_SECRET: string;
  /** Shared with app servers that check passes themselves. Lets them pass on the buyer's address for rate limits. */
  PASS_SERVICE_KEY?: string;
  /** Where the site is served, like https://polymadlabs.com. Checkout sends buyers back here. */
  PUBLIC_ORIGIN?: string;
  /** The kill switch: exactly "true" opens checkout. A secret, so it can be flipped without a code change. */
  PAYMENTS_ENABLED?: string;
  /** "test" or "live". Set in wrangler.jsonc for each environment. */
  PAYMENTS_MODE?: string;
  /** "staging" or "production". Set in wrangler.jsonc. Missing means local. */
  ENVIRONMENT?: string;
  /** Origins allowed to call the pass API from a browser, comma-separated. Set in wrangler.jsonc. */
  ALLOWED_ORIGINS?: string;
  /** Staging only: JSON list of extra app links ({ app, name, url }) for testing a pass on another address. */
  EXTRA_APP_LINKS?: string;
}
