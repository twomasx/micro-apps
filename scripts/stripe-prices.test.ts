import { priceLookupKey } from '@micro/payments';
import { describe, expect, it } from 'vitest';
import { productsOf, SELLERS } from './lib/catalog.ts';
import { stripeFor } from './lib/stripe.ts';

// Asks Stripe's test API, so it only runs when a test key is set:
//   STRIPE_SECRET_KEY=$(grep '^STRIPE_SECRET_KEY=' apps/focus/.env | cut -d= -f2-) pnpm --filter @micro/scripts test
const key = process.env.STRIPE_SECRET_KEY;

describe.skipIf(!/^(sk|rk)_test_/.test(key ?? ''))('Stripe test prices', () => {
  for (const app of SELLERS) {
    for (const product of productsOf(app)) {
      it(`${app} ${product.id} costs the same in Stripe as in config/products.json`, async () => {
        const stripe = stripeFor('test');
        const prices = await stripe.prices.list({ lookup_keys: [priceLookupKey(app, product.id)], active: true });
        expect(prices.data).toHaveLength(1);
        expect(prices.data[0]).toMatchObject({ unit_amount: product.amount, currency: product.currency });
      });
    }
  }
});
