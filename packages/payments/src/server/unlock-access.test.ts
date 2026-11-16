import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import schema from '../../test/schema.sql?raw';
import { createTestDb, type TestDb } from '../../test/db';
import type { Product } from '../types';
import { formatCode, unlockCodeFor } from '../unlock-codes';
import { DEVICE_LIMIT } from './guard';
import { purchaseStore } from './store';
import { isPaidCode, requestHasUnlock, UNLOCK_HEADER } from './unlock-access';

const SECRET = 'test-secret-that-is-long-enough-0123456789';
const PRODUCT: Product = { id: 'lifetime', name: 'Lifetime unlock', amount: 999, currency: 'usd' };
const DEVICE = 'abcdefghijkm23456789';

let testDb: TestDb;
let db: D1Database;

beforeAll(async () => {
  testDb = await createTestDb(schema);
  db = testDb.db;
});

afterAll(async () => {
  await testDb.dispose();
});

/** A purchase in the given state, and its code as the buyer sees it. */
async function purchase(sessionId: string, mode: 'test' | 'live' = 'test'): Promise<string> {
  const store = purchaseStore({ db, app: 'personality', mode, codeSecret: SECRET });
  await store.insertPending(sessionId, PRODUCT);
  await store.markPaid(sessionId, null);
  return formatCode(await unlockCodeFor(SECRET, sessionId));
}

const request = (headers: Record<string, string>) =>
  new Request('https://polymadlabs.com/personality/api/results/x/report', { headers });

describe('requestHasUnlock', () => {
  it('a paid code of this app, in this mode, with a device id, unlocks', async () => {
    const code = await purchase('cs_test_access_paid');
    const access = { db, app: 'personality', mode: 'test' as const };
    expect(await requestHasUnlock(request({ [UNLOCK_HEADER]: code, 'X-Device-Id': DEVICE }), access)).toBe(true);
    // Typed in lower case with spaces, as people do.
    expect(await requestHasUnlock(request({ [UNLOCK_HEADER]: code.toLowerCase().replace(/-/g, ' '), 'X-Device-Id': DEVICE }), access)).toBe(true);
  });

  it('needs a device id, from the header or the body', async () => {
    const code = await purchase('cs_test_access_device');
    const access = { db, app: 'personality', mode: 'test' as const };
    expect(await requestHasUnlock(request({ [UNLOCK_HEADER]: code }), access)).toBe(false);
    expect(await requestHasUnlock(request({ [UNLOCK_HEADER]: code, 'X-Device-Id': 'bad id' }), access)).toBe(false);
    expect(await requestHasUnlock(request({ [UNLOCK_HEADER]: code }), access, DEVICE)).toBe(true);
  });

  it('a code from the other mode, a refunded purchase or a made-up code does not', async () => {
    const live = await purchase('cs_live_access_other', 'live');
    const refunded = await purchase('cs_test_access_refunded');
    await purchaseStore({ db, app: 'personality', mode: 'test' }).revoke('cs_test_access_refunded', 'refunded');
    const access = { db, app: 'personality', mode: 'test' as const };
    for (const code of [live, refunded, 'AAAA-BBBB-CCCC-DDDD', 'not a code']) {
      expect(await requestHasUnlock(request({ [UNLOCK_HEADER]: code, 'X-Device-Id': DEVICE }), access)).toBe(false);
    }
  });

  it(`stops at ${DEVICE_LIMIT} devices per code`, async () => {
    const code = await purchase('cs_test_access_cap');
    const access = { db, app: 'personality', mode: 'test' as const };
    for (let n = 0; n < DEVICE_LIMIT; n++) {
      expect(await isPaidCode(code, access, `device${n}abcdefgh`)).toBe(true);
    }
    expect(await isPaidCode(code, access, 'device9abcdefgh')).toBe(false);
    // A device already counted keeps working.
    expect(await isPaidCode(code, access, 'device0abcdefgh')).toBe(true);
  });

  it('falls back to the all-app pass, and never asks the pass service without one set up', async () => {
    const fetcher = vi.fn(async () => Response.json({ valid: true, status: 'active' })) as unknown as typeof fetch;
    const headers = { 'X-Pass-Code': 'K7QM-XRP2-9VTD-4HNC', 'X-Device-Id': DEVICE };
    const pass = { passOrigin: 'https://pass.example', serviceKey: 'k', app: 'unlock-access-test', fetcher };
    expect(await requestHasUnlock(request(headers), { db, app: 'personality', mode: 'test', pass })).toBe(true);
    expect(await requestHasUnlock(request(headers), { db, app: 'personality', mode: 'test' })).toBe(false);
  });
});
