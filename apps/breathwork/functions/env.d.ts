interface Env {
  DB: D1Database;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  /** At least 32 random characters. Unlock codes are made from it, so never change it once codes exist. */
  UNLOCK_CODE_SECRET: string;
  /** Where the site is served, like https://polymadlabs.com. Checkout sends buyers back here. */
  PUBLIC_ORIGIN?: string;
}
