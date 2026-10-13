interface Env {
  DB: D1Database;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  /** Where the site is served, like https://polymadlabs.com. Checkout sends buyers back here. */
  PUBLIC_ORIGIN?: string;
}
