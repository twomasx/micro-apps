import Stripe from 'stripe';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { keyMode } from './settings';
import { createStripePayments, readEvent } from './stripe';
import { PriceMismatchError } from './types';

const WEBHOOK_SECRET = 'whsec_test_secret_for_signatures';
const PRODUCTS = [{ id: 'lifetime', name: 'Lifetime unlock', amount: 699, currency: 'usd' }];
const signer = new Stripe('sk_test_signer');

function provider(mode: 'test' | 'live' = 'test') {
  return createStripePayments({
    app: 'focus',
    mode,
    secretKey: mode === 'test' ? 'sk_test_fake' : 'sk_live_fake',
    webhookSecret: WEBHOOK_SECRET,
    products: PRODUCTS,
  });
}

async function signedRequest(event: object, secret = WEBHOOK_SECRET): Promise<Request> {
  const payload = JSON.stringify(event);
  const header = await signer.webhooks.generateTestHeaderStringAsync({
    payload,
    secret,
    cryptoProvider: Stripe.createSubtleCryptoProvider(),
  });
  return new Request('http://localhost/api/stripe/webhook', {
    method: 'POST',
    headers: { 'stripe-signature': header },
    body: payload,
  });
}

const completedEvent = (livemode = false) => ({
  id: 'evt_1',
  object: 'event',
  livemode,
  type: 'checkout.session.completed',
  data: { object: { id: 'cs_test_session0001', object: 'checkout.session' } },
});

/** Answers Stripe API calls from a table of path to JSON body. */
function stubStripe(routes: Record<string, unknown>) {
  const calls: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
      calls.push(`${init?.method ?? 'GET'} ${url.pathname}${url.search}`);
      const body = routes[url.pathname];
      if (body === undefined) return Response.json({ error: { message: 'not stubbed' } }, { status: 404 });
      return Response.json(body);
    }),
  );
  return calls;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('mode', () => {
  it('refuses a key from the other mode', () => {
    expect(() =>
      createStripePayments({ app: 'focus', mode: 'live', secretKey: 'sk_test_x', webhookSecret: '', products: [] }),
    ).toThrow(/sk_live_/);
    expect(() =>
      createStripePayments({ app: 'focus', mode: 'test', secretKey: 'sk_live_x', webhookSecret: '', products: [] }),
    ).toThrow(/sk_test_/);
    expect(() =>
      createStripePayments({ app: 'focus', mode: 'live', secretKey: 'rk_test_x', webhookSecret: '', products: [] }),
    ).toThrow(/rk_live_/);
  });

  it('takes a restricted key of its own mode', () => {
    expect(() =>
      createStripePayments({ app: 'focus', mode: 'live', secretKey: 'rk_live_x', webhookSecret: '', products: [] }),
    ).not.toThrow();
    expect(() =>
      createStripePayments({ app: 'focus', mode: 'test', secretKey: 'rk_test_x', webhookSecret: '', products: [] }),
    ).not.toThrow();
  });

  it('reads the mode from either kind of key', () => {
    expect(keyMode('sk_live_x')).toBe('live');
    expect(keyMode('rk_live_x')).toBe('live');
    expect(keyMode('rk_test_x')).toBe('test');
    expect(keyMode('pk_live_x')).toBeNull();
    expect(keyMode('live_x')).toBeNull();
  });
});

describe('webhook signature', () => {
  it('accepts an event signed with the endpoint secret', async () => {
    const event = await provider().handleWebhook(await signedRequest(completedEvent()));
    expect(event).toEqual({ type: 'checkout.completed', eventId: 'evt_1', sessionId: 'cs_test_session0001' });
  });

  it('rejects an event signed with another secret', async () => {
    await expect(provider().handleWebhook(await signedRequest(completedEvent(), 'whsec_wrong'))).rejects.toThrow();
  });

  it('rejects an unsigned event and a changed body', async () => {
    const unsigned = new Request('http://localhost/', { method: 'POST', body: JSON.stringify(completedEvent()) });
    await expect(provider().handleWebhook(unsigned)).rejects.toThrow(/stripe-signature/);

    const signed = await signedRequest(completedEvent());
    const tampered = new Request('http://localhost/', {
      method: 'POST',
      headers: signed.headers,
      body: JSON.stringify({ ...completedEvent(), id: 'evt_2' }),
    });
    await expect(provider().handleWebhook(tampered)).rejects.toThrow();
  });
});

describe('readEvent', () => {
  const noSession = async () => null;
  const sessionFor = async (paymentIntentId: string | null) => (paymentIntentId === 'pi_1' ? 'cs_test_session0001' : null);

  it('never acts on an event from the other mode', async () => {
    expect(await readEvent(completedEvent(true) as Stripe.Event, false, noSession)).toEqual({
      type: 'wrong_mode',
      eventId: 'evt_1',
    });
    expect(await readEvent(completedEvent(false) as Stripe.Event, true, noSession)).toEqual({
      type: 'wrong_mode',
      eventId: 'evt_1',
    });
  });

  it('links a full and a partial refund to the checkout session', async () => {
    const refund = (refunded: boolean) =>
      ({
        id: 'evt_r',
        livemode: false,
        type: 'charge.refunded',
        data: { object: { id: 'ch_1', payment_intent: 'pi_1', refunded } },
      }) as unknown as Stripe.Event;
    expect(await readEvent(refund(true), false, sessionFor)).toEqual({
      type: 'charge.refunded',
      eventId: 'evt_r',
      sessionId: 'cs_test_session0001',
      paymentIntentId: 'pi_1',
      full: true,
    });
    expect(await readEvent(refund(false), false, sessionFor)).toMatchObject({ full: false });
  });

  it('links a dispute to the checkout session', async () => {
    const dispute = {
      id: 'evt_d',
      livemode: false,
      type: 'charge.dispute.created',
      data: { object: { id: 'dp_1', payment_intent: 'pi_1' } },
    } as unknown as Stripe.Event;
    expect(await readEvent(dispute, false, sessionFor)).toEqual({
      type: 'charge.disputed',
      eventId: 'evt_d',
      sessionId: 'cs_test_session0001',
      paymentIntentId: 'pi_1',
    });
  });

  it('ignores every other event type', async () => {
    const other = { id: 'evt_o', livemode: false, type: 'customer.created', data: { object: {} } } as unknown as Stripe.Event;
    expect(await readEvent(other, false, noSession)).toEqual({ type: 'ignored', eventId: 'evt_o', stripeType: 'customer.created' });
  });
});

describe('verifyPurchase', () => {
  const session = (fields: object) => ({
    id: 'cs_test_session0001',
    object: 'checkout.session',
    livemode: false,
    status: 'complete',
    payment_status: 'paid',
    payment_intent: 'pi_1',
    metadata: { app: 'focus', productId: 'lifetime' },
    ...fields,
  });

  it('says paid for a complete, paid session of this app', async () => {
    stubStripe({ '/v1/checkout/sessions/cs_test_session0001': session({}) });
    expect(await provider().verifyPurchase('cs_test_session0001')).toEqual({
      paid: true,
      productId: 'lifetime',
      paymentIntentId: 'pi_1',
    });
  });

  it('refuses unpaid and expired sessions, other apps and the other mode', async () => {
    for (const fields of [
      { status: 'open', payment_status: 'unpaid', payment_intent: null },
      { status: 'expired', payment_status: 'unpaid', payment_intent: null },
      { metadata: { app: 'breathwork', productId: 'lifetime' } },
      { livemode: true },
    ]) {
      stubStripe({ '/v1/checkout/sessions/cs_test_session0001': session(fields) });
      expect((await provider().verifyPurchase('cs_test_session0001')).paid).toBe(false);
    }
  });
});

describe('createCheckout', () => {
  const price = (unit_amount: number) => ({
    object: 'list',
    data: [{ id: 'price_1', object: 'price', unit_amount, currency: 'usd', lookup_key: 'focus:lifetime' }],
  });

  it('charges the Stripe price found by lookup key, cards only, marked with app and mode', async () => {
    const calls = stubStripe({
      '/v1/prices': price(699),
      '/v1/checkout/sessions': { id: 'cs_test_new000000001', object: 'checkout.session', url: 'https://checkout.stripe.com/x' },
    });
    const session = await provider().createCheckout({
      productId: 'lifetime',
      successUrl: 'https://example.test/ok',
      cancelUrl: 'https://example.test/no',
    });
    expect(session).toEqual({ sessionId: 'cs_test_new000000001', url: 'https://checkout.stripe.com/x' });
    expect(decodeURIComponent(calls[0] ?? '')).toContain('lookup_keys[0]=focus:lifetime');
    const create = vi.mocked(fetch).mock.calls[1]?.[1]?.body;
    const form = decodeURIComponent(String(create));
    expect(form).toContain('line_items[0][price]=price_1');
    expect(form).toContain('allowed_payment_method_types[0]=card');
    expect(form).not.toContain('allowed_payment_method_types[1]');
    expect(form).toContain('metadata[app]=focus');
    expect(form).toContain('metadata[mode]=test');
    expect(form).toContain('payment_intent_data[metadata][app]=focus');
  });

  it('refuses when the Stripe price differs from config or is missing', async () => {
    stubStripe({ '/v1/prices': price(599) });
    await expect(
      provider().createCheckout({ productId: 'lifetime', successUrl: 'x', cancelUrl: 'y' }),
    ).rejects.toBeInstanceOf(PriceMismatchError);
    stubStripe({ '/v1/prices': { object: 'list', data: [] } });
    await expect(
      provider().createCheckout({ productId: 'lifetime', successUrl: 'x', cancelUrl: 'y' }),
    ).rejects.toBeInstanceOf(PriceMismatchError);
  });
});
