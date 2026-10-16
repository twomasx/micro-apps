import type { PaymentsSettings } from '@micro/payments';
import { formatPassCode, passCodeFor } from '@micro/payments/pass-codes';
import { PASS_CODES, purchaseStore, type PaymentsContext } from '@micro/payments/server';
import { eventId, FakeProvider, webhookRequest } from '@micro/payments/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import catalog from '../config/products.json';
import { allowedOrigins, cors, corsRoute, preflight } from './cors.ts';
import { appLinks } from './links.ts';
import { passes } from './passes.ts';
import { createToken, redeemToken, TOKEN_MS } from './tokens.ts';
import { createTestDb, type TestDb } from './testing.ts';
import { hashCode } from '@micro/payments/unlock-codes';
import { verify } from './verify.ts';

const SECRET = 'pass-secret-that-is-long-enough-0123456789';
const DEVICE = 'abcdefghijkmnpqrstuvw';
let testDb: TestDb;
let db: D1Database;
let fake: FakeProvider;

beforeAll(async () => {
  testDb = await createTestDb();
  db = testDb.db;
  fake = new FakeProvider('cs_test_pass');
});

afterAll(async () => {
  await testDb.dispose();
});

function context(settings: Partial<PaymentsSettings> = {}): PaymentsContext {
  const full: PaymentsSettings = { enabled: true, mode: 'test', environment: 'local', passOrigin: '', ...settings };
  return {
    settings: full,
    store: purchaseStore({ db, app: 'pass', mode: full.mode, codeSecret: SECRET, codes: PASS_CODES }),
    provider: () => fake,
  };
}

let nextAddress = 1;

/** A POST from a new network address each time, unless headers say otherwise. */
const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request(`https://polymadlabs.com/pass/api/${path}`, {
    method: 'POST',
    headers: { 'CF-Connecting-IP': `198.51.100.${nextAddress++}`, ...headers },
    body: JSON.stringify(body),
  });

/** Buys a pass through checkout and the webhook. Returns its session and code. */
async function buyPass(): Promise<{ sessionId: string; code: string }> {
  const response = await passes.checkout(post('checkout', { product: 'pass' }), context(), 'https://polymadlabs.com');
  expect(response.status).toBe(201);
  const sessionId = ((await response.json()) as { url: string }).url.replace('https://checkout.example/', '');
  fake.pay(sessionId);
  await passes.webhook(webhookRequest({ type: 'checkout.completed', eventId: eventId(), sessionId }), context());
  return { sessionId, code: await passCodeFor(SECRET, sessionId) };
}

async function ask(code: string, mode: 'test' | 'live' = 'test') {
  const response = await verify(post('verify', { code, deviceId: DEVICE, app: 'focus' }), context({ mode }));
  return { status: response.status, body: (await response.json()) as { valid: boolean; status: string } };
}

describe('pass checkout', () => {
  it('sells the pass at the price in config/products.json and comes back to /pass/thanks', async () => {
    expect(passes.product).toEqual(catalog.products[0]);
    expect(passes.product.amount).toBe(1999);
    await passes.checkout(post('checkout', { product: 'pass' }), context(), 'https://polymadlabs.com');
    expect(fake.checkouts.at(-1)).toMatchObject({
      productId: 'pass',
      successUrl: 'https://polymadlabs.com/pass/thanks?session_id={CHECKOUT_SESSION_ID}',
    });
  });

  it('the success page shows the pass code in groups of four', async () => {
    const { sessionId, code } = await buyPass();
    const answer = (await (await passes.purchase(sessionId, context())).json()) as { code: string };
    expect(answer.code).toBe(formatPassCode(code));
    expect(answer.code).toMatch(/^[2-9A-HJKMNP-TV-Z]{4}(-[2-9A-HJKMNP-TV-Z]{4}){3}$/);
  });

  it('is closed while the kill switch is off', async () => {
    expect((await passes.checkout(post('checkout', { product: 'pass' }), context({ enabled: false }))).status).toBe(503);
  });
});

describe('verify', () => {
  it('says active for a paid pass, typed any way', async () => {
    const { code } = await buyPass();
    expect((await ask(code)).body).toEqual({ valid: true, status: 'active' });
    expect((await ask(formatPassCode(code).toLowerCase())).body.valid).toBe(true);
  });

  it('says refunded or disputed after Stripe says so', async () => {
    const refunded = await buyPass();
    await passes.webhook(
      webhookRequest({ type: 'charge.refunded', eventId: eventId(), sessionId: refunded.sessionId, paymentIntentId: null, full: true }),
      context(),
    );
    expect((await ask(refunded.code)).body).toEqual({ valid: false, status: 'refunded' });

    const disputed = await buyPass();
    await passes.webhook(
      webhookRequest({ type: 'charge.disputed', eventId: eventId(), sessionId: disputed.sessionId, paymentIntentId: null }),
      context(),
    );
    expect((await ask(disputed.code)).body).toEqual({ valid: false, status: 'disputed' });
  });

  it('says unknown for a code nobody bought, a malformed code, and a test pass asked in live mode', async () => {
    const { code } = await buyPass();
    expect((await ask('K7QM-XRP2-9VTD-4HNC')).body).toEqual({ valid: false, status: 'unknown' });
    expect((await ask('nope')).body).toEqual({ valid: false, status: 'unknown' });
    expect((await ask(code, 'live')).body).toEqual({ valid: false, status: 'unknown' });
  });

  it('needs a device id and the app name', async () => {
    const { code } = await buyPass();
    expect((await verify(post('verify', { code }), context())).status).toBe(400);
    expect((await verify(post('verify', { code, deviceId: 'x', app: 'focus' }), context())).status).toBe(400);
  });

  it('stores the pass code only as a hash', async () => {
    const { code } = await buyPass();
    const rows = JSON.stringify((await db.prepare('SELECT * FROM purchases').all()).results);
    expect(rows).not.toContain(code);
    expect(rows).not.toContain(formatPassCode(code));
  });
});

describe('one-time tokens', () => {
  const NOW = 1_800_000_000_000;

  async function token(code: string, now = NOW) {
    const response = await createToken(post('token', { code }), context(), db, now);
    return { status: response.status, body: (await response.json()) as { token: string; expiresAt: number } };
  }

  async function redeem(value: string, now = NOW) {
    const response = await redeemToken(post('redeem', { token: value, deviceId: DEVICE, app: 'focus' }), context(), db, now);
    return { status: response.status, body: (await response.json()) as { code?: string; valid?: boolean } };
  }

  it('carry the pass code into an app once', async () => {
    const { code } = await buyPass();
    const made = await token(formatPassCode(code));
    expect(made.status).toBe(201);
    expect(made.body.token).toMatch(/^[a-z0-9]{32}$/);
    expect(made.body.expiresAt).toBe(NOW + TOKEN_MS);

    expect(await redeem(made.body.token, NOW + 1000)).toEqual({
      status: 200,
      body: { code: formatPassCode(code), valid: true, status: 'active' },
    });
    expect((await redeem(made.body.token, NOW + 2000)).status).toBe(410);
  });

  it('expire after 10 minutes', async () => {
    const { code } = await buyPass();
    const made = await token(code);
    expect((await redeem(made.body.token, NOW + TOKEN_MS)).status).toBe(410);
  });

  it('are stored only as a hash', async () => {
    const { code } = await buyPass();
    const made = await token(code);
    expect(JSON.stringify((await db.prepare('SELECT * FROM pass_tokens').all()).results)).not.toContain(made.body.token);
  });

  it('are refused for an unknown or refunded pass, and do not work after a refund', async () => {
    expect((await token('K7QM-XRP2-9VTD-4HNC')).status).toBe(404);
    const { sessionId, code } = await buyPass();
    const made = await token(code);
    await passes.webhook(
      webhookRequest({ type: 'charge.refunded', eventId: eventId(), sessionId, paymentIntentId: null, full: true }),
      context(),
    );
    expect((await redeem(made.body.token)).status).toBe(410);
    expect((await token(code)).status).toBe(404);
  });

  it('refuse a malformed token or a missing device', async () => {
    expect((await redeem('short')).status).toBe(400);
    const response = await redeemToken(post('redeem', { token: 'a'.repeat(32) }), context(), db, NOW);
    expect(response.status).toBe(400);
  });
});

describe('CORS', () => {
  const allowed = allowedOrigins('https://polymadlabs.com, https://focus.example/');
  const from = (origin?: string) =>
    new Request('https://polymadlabs.com/pass/api/verify', { method: 'POST', headers: origin ? { Origin: origin } : {} });

  it('lets listed sites call the API from the browser', () => {
    const answer = cors(from('https://focus.example'), allowed);
    expect(answer).toMatchObject({ allowed: true, headers: { 'Access-Control-Allow-Origin': 'https://focus.example', Vary: 'Origin' } });
    expect(preflight(from('https://focus.example'), allowed).status).toBe(204);
  });

  it('refuses every other site, before doing anything', async () => {
    expect(cors(from('https://evil.example'), allowed).allowed).toBe(false);
    expect(preflight(from('https://evil.example'), allowed).status).toBe(403);
    let ran = false;
    const response = await corsRoute(from('https://evil.example'), 'https://polymadlabs.com', async () => {
      ran = true;
      return new Response('ok');
    });
    expect(response.status).toBe(403);
    expect(ran).toBe(false);
  });

  it('lets app servers call with no Origin header', () => {
    expect(cors(from(), allowed)).toEqual({ allowed: true, headers: {} });
  });
});

describe('app links', () => {
  it('lists every app by path, plus extra test addresses on staging', () => {
    expect(appLinks(undefined).map((link) => link.url)).toEqual(['/personality/', '/focus/', '/breathwork/', '/attention/', '/intention/']);
    const extra = appLinks('[{"app":"focus","name":"Focus elsewhere","url":"https://x.example/focus/"},{"app":"bad","name":"b","url":"javascript:alert(1)"}]');
    expect(extra.at(-1)).toEqual({ app: 'focus', name: 'Focus elsewhere', url: 'https://x.example/focus/' });
    expect(extra).toHaveLength(6);
    expect(appLinks('not json')).toHaveLength(5);
  });
});

describe('pass code security', () => {
  const device = (n: number) => `pdevice${String(n).padStart(13, '0')}`;
  const askAs = async (code: string, app: string, deviceId: string, headers: Record<string, string> = {}, serviceKey?: string) => {
    const response = await verify(post('verify', { code, deviceId, app }, headers), context(), serviceKey);
    return { status: response.status, body: (await response.json()) as { valid?: boolean; status?: string } };
  };

  it('works on 5 devices in each app; the 6th in that app is refused, other apps are counted on their own', async () => {
    const { code } = await buyPass();
    for (let n = 1; n <= 5; n++) expect((await askAs(code, 'focus', device(n))).body.status).toBe('active');
    expect((await askAs(code, 'focus', device(6))).body).toEqual({ valid: false, status: 'device_limit' });
    // One phone has its own device id in every app, so other apps start from zero.
    expect((await askAs(code, 'breathwork', device(6))).body.status).toBe('active');
    await db.prepare('DELETE FROM code_devices WHERE code_hash = ? AND app = ?').bind(await hashCode(code), 'focus').run();
    expect((await askAs(code, 'focus', device(6))).body.status).toBe('active');
  });

  it('the 11th check in a minute from one address is refused', async () => {
    const { code } = await buyPass();
    const from = { 'CF-Connecting-IP': '203.0.113.5' };
    for (let n = 0; n < 10; n++) expect((await askAs('K7QM-XRP2-9VTD-4HNC', 'focus', device(1), from)).status).toBe(200);
    expect((await askAs(code, 'focus', device(1), from)).status).toBe(429);
  });

  it("counts an app server's checks against the buyer's address only with the right service key", async () => {
    const { code } = await buyPass();
    const viaServer = (key: string) => ({ 'CF-Connecting-IP': '192.0.2.1', 'X-Client-IP': '203.0.113.200', 'X-Pass-Service-Key': key });
    for (let n = 0; n < 10; n++) await askAs(code, 'personality', device(1), viaServer('right'), 'right');
    // The buyer's address is used up; the app server's own address is not.
    expect((await askAs(code, 'personality', device(1), viaServer('right'), 'right')).status).toBe(429);
    expect((await askAs(code, 'personality', device(1), { 'CF-Connecting-IP': '192.0.2.1' }, 'right')).status).toBe(200);
    // A wrong key cannot pick an address to blame: its checks count against its own.
    for (let n = 0; n < 9; n++) await askAs(code, 'personality', device(1), viaServer('wrong'), 'right');
    expect((await askAs(code, 'personality', device(1), viaServer('wrong'), 'right')).status).toBe(429);
  });
});
