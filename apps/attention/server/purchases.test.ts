import type { PaymentsSettings } from '@micro/payments';
import { purchaseStore, type PaymentsContext } from '@micro/payments/server';
import { eventId, FakeProvider, webhookRequest } from '@micro/payments/testing';
import { formatCode, unlockCodeFor } from '@micro/payments/unlock-codes';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import catalog from '../config/products.json';
import { purchases } from './purchases.ts';
import { createTestDb, type TestDb } from './testing.ts';

// The shared payment logic is tested in packages/payments. These tests check this app's
// product, return address and migrations with it.

const SECRET = 'test-secret-that-is-long-enough-0123456789';
let testDb: TestDb;
let fake: FakeProvider;

beforeAll(async () => {
  testDb = await createTestDb();
  fake = new FakeProvider('cs_test_attention');
});

afterAll(async () => {
  await testDb.dispose();
});

function context(settings: Partial<PaymentsSettings> = {}): PaymentsContext {
  const full: PaymentsSettings = { enabled: true, mode: 'test', environment: 'local', passOrigin: '', ...settings };
  return {
    settings: full,
    store: purchaseStore({ db: testDb.db, app: 'attention', mode: full.mode, codeSecret: SECRET }),
    provider: () => fake,
  };
}

function checkout(settings: Partial<PaymentsSettings> = {}): Promise<Response> {
  const request = new Request('http://127.0.0.1:8803/api/checkout', {
    method: 'POST',
    body: JSON.stringify({ product: 'lifetime' }),
  });
  return purchases.checkout(request, context(settings), 'https://example.test');
}

let nextAddress = 1;

async function check(code: string): Promise<boolean> {
  const request = new Request('http://127.0.0.1/api/unlock/x', {
    headers: { 'X-Device-Id': 'device000000000001', 'CF-Connecting-IP': `198.51.100.${nextAddress++}` },
  });
  return ((await (await purchases.unlock(request, code, context())).json()) as { valid: boolean }).valid;
}

describe('attention payments', () => {
  it('sells the lifetime unlock at the price in config/products.json', () => {
    expect(purchases.product).toEqual(catalog.products.find((p) => p.id === 'lifetime'));
  });

  it('sends the buyer back to /attention/unlock', async () => {
    expect((await checkout()).status).toBe(201);
    expect(fake.checkouts.at(-1)).toMatchObject({
      successUrl: 'https://example.test/attention/unlock?session_id={CHECKOUT_SESSION_ID}',
      cancelUrl: 'https://example.test/attention/unlock',
    });
  });

  it('is closed while the kill switch is off', async () => {
    expect((await checkout({ enabled: false })).status).toBe(503);
  });

  it("this app's migrations hold a purchase from checkout through payment to refund", async () => {
    const { url } = (await (await checkout()).json()) as { url: string };
    const sessionId = url.replace('https://checkout.example/', '');
    fake.pay(sessionId);
    const webhook = (event: Parameters<typeof webhookRequest>[0]) => purchases.webhook(webhookRequest(event), context());

    expect((await webhook({ type: 'checkout.completed', eventId: eventId(), sessionId })).status).toBe(200);
    const code = await unlockCodeFor(SECRET, sessionId);
    expect(await check(code)).toBe(true);
    const answer = await (await purchases.purchase(sessionId, context())).json();
    expect(answer).toEqual({ paid: true, code: formatCode(code) });

    await webhook({ type: 'charge.refunded', eventId: eventId(), sessionId, paymentIntentId: null, full: true });
    expect(await check(code)).toBe(false);
  });
});
