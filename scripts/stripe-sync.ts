/**
 * Makes the Stripe products and prices match every config/products.json, in one mode.
 *
 *   pnpm --filter @micro/scripts stripe-sync                      # test mode: check and create missing prices
 *   pnpm --filter @micro/scripts stripe-sync --check              # only check, change nothing
 *   pnpm --filter @micro/scripts stripe-sync --webhooks https://staging.polymadlabs.com --secrets-dir ~/.config/polymadlabs/staging
 *   pnpm --filter @micro/scripts stripe-sync --live ...           # go-live only (PAYMENTS.md section 6)
 *
 * Needs STRIPE_SECRET_KEY for the mode. With --live it also needs STRIPE_TEST_SECRET_KEY, because it
 * refuses to run unless the test prices match config too, so live matches what was tested.
 *
 * Each price has the lookup key "<app>:<product id>", which is how checkout finds it. Stripe prices
 * cannot change, so a price that differs from config is never fixed here: the script stops and says which.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { priceLookupKey, type PaymentsMode } from '@micro/payments';
import type Stripe from 'stripe';
import { money, productsOf, SELLERS } from './lib/catalog.ts';
import { flag, modeFromArgs, stripeFor, webhookEnvironment } from './lib/stripe.ts';

const WEBHOOK_EVENTS: Stripe.WebhookEndpointCreateParams.EnabledEvent[] = [
  'checkout.session.completed',
  'charge.refunded',
  'charge.dispute.created',
  'charge.dispute.closed',
];

interface Wanted {
  app: string;
  id: string;
  name: string;
  amount: number;
  currency: string;
  lookupKey: string;
}

function wanted(): Wanted[] {
  return SELLERS.flatMap((app) =>
    productsOf(app).map((product) => ({ app, ...product, lookupKey: priceLookupKey(app, product.id) })),
  );
}

async function findPrice(stripe: Stripe, lookupKey: string): Promise<Stripe.Price | null> {
  const prices = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
  return prices.data[0] ?? null;
}

/** Every product whose Stripe price exists and differs from config. Missing prices are not mismatches. */
async function mismatches(stripe: Stripe, mode: PaymentsMode): Promise<string[]> {
  const problems: string[] = [];
  for (const product of wanted()) {
    const price = await findPrice(stripe, product.lookupKey);
    if (price && (price.unit_amount !== product.amount || price.currency !== product.currency)) {
      problems.push(
        `${mode} ${product.lookupKey}: Stripe has ${money(price.unit_amount ?? 0, price.currency)}, config says ${money(product.amount, product.currency)}`,
      );
    }
  }
  return problems;
}

async function syncPrices(stripe: Stripe, mode: PaymentsMode, checkOnly: boolean): Promise<number> {
  let missing = 0;
  for (const product of wanted()) {
    const price = await findPrice(stripe, product.lookupKey);
    if (price) {
      console.log(`ok       ${product.lookupKey}  ${money(product.amount, product.currency)}  ${price.id}`);
      continue;
    }
    missing += 1;
    if (checkOnly) {
      console.log(`missing  ${product.lookupKey}  ${money(product.amount, product.currency)}`);
      continue;
    }
    const created = await stripe.prices.create({
      lookup_key: product.lookupKey,
      unit_amount: product.amount,
      currency: product.currency,
      product_data: {
        name: product.name,
        metadata: { app: product.app, productId: product.id },
      },
      metadata: { app: product.app, productId: product.id },
    });
    console.log(`created  ${product.lookupKey}  ${money(product.amount, product.currency)}  ${created.id} (${mode})`);
  }
  return missing;
}

/** One webhook endpoint per app that sells something, at <origin>/<app>/api/stripe/webhook. */
async function syncWebhooks(stripe: Stripe, origin: string, secretsDir: string | undefined, environment: string) {
  const existing = await stripe.webhookEndpoints.list({ limit: 100 });
  for (const app of SELLERS) {
    if (productsOf(app).length === 0) continue;
    const url = `${origin}/${app}/api/stripe/webhook`;
    const found = existing.data.find((endpoint) => endpoint.url === url);
    if (found) {
      const events = new Set(found.enabled_events);
      if (!WEBHOOK_EVENTS.every((event) => events.has(event))) {
        await stripe.webhookEndpoints.update(found.id, { enabled_events: WEBHOOK_EVENTS });
        console.log(`updated  ${url}  ${found.id}`);
      } else {
        console.log(`ok       ${url}  ${found.id}`);
      }
      continue;
    }
    const created = await stripe.webhookEndpoints.create({
      url,
      enabled_events: WEBHOOK_EVENTS,
      description: `${app} ${environment}`,
    });
    console.log(`created  ${url}  ${created.id}`);
    const project = `micro-${app}`;
    const envFlag = environment === 'staging' ? ' --env preview' : '';
    if (secretsDir) {
      mkdirSync(secretsDir, { recursive: true, mode: 0o700 });
      const file = join(secretsDir, `${app}-stripe-webhook-secret`);
      writeFileSync(file, created.secret ?? '', { mode: 0o600 });
      console.log(`         signing secret saved to ${file}. Set it with:`);
      console.log(`         cat ${file} | pnpm exec wrangler pages secret put STRIPE_WEBHOOK_SECRET --project-name ${project}${envFlag}`);
    } else {
      // Printed once, for Roger to run in his own terminal. Never paste it into a chat.
      console.log(`         printf '%s' '${created.secret}' | pnpm exec wrangler pages secret put STRIPE_WEBHOOK_SECRET --project-name ${project}${envFlag}`);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const mode = modeFromArgs(args);
  const stripe = stripeFor(mode);
  const checkOnly = args.includes('--check');

  const problems = await mismatches(stripe, mode);
  if (mode === 'live') problems.push(...(await mismatches(stripeFor('test', 'STRIPE_TEST_SECRET_KEY'), 'test')));
  if (problems.length > 0) {
    console.error('Stopped. These Stripe prices differ from config/products.json:');
    for (const problem of problems) console.error(`  ${problem}`);
    console.error('Stripe prices cannot be edited. Decide which is right before running this again.');
    process.exit(1);
  }

  const missing = await syncPrices(stripe, mode, checkOnly);
  if (checkOnly && missing > 0) process.exit(1);

  const origin = flag(args, '--webhooks');
  if (origin && !checkOnly) {
    const environment = webhookEnvironment(origin, mode);
    await syncWebhooks(stripe, origin.replace(/\/$/, ''), flag(args, '--secrets-dir'), environment);
  }
}

await main();
