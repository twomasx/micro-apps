import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { hasLabPass } from './labpass.ts';
import { createTestDb, type TestDb } from './testing.ts';

let testDb: TestDb;

beforeAll(async () => {
  testDb = await createTestDb();
});

afterAll(async () => {
  await testDb.dispose();
});

const DEVICE = 'abcdefghijkm23456789';
const request = (headers: Record<string, string>) => new Request('https://polymadlabs.com/intention/api/me', { headers });

describe('hasLabPass with the all-app pass', () => {
  it('an active pass counts as Lab Pass, asked of the pass service with this app name', async () => {
    const fetcher = vi.fn(async () => Response.json({ valid: true, status: 'active' })) as unknown as typeof fetch;
    const ok = await hasLabPass(request({ 'X-Pass-Code': 'K7QM-XRP2-9VTD-4HNC', 'X-Device-Id': DEVICE }), testDb.db, {
      mode: 'test',
      pass: { passOrigin: 'https://pass.example', serviceKey: 'k', app: 'intention', fetcher },
    });
    expect(ok).toBe(true);
    expect(JSON.parse(String((vi.mocked(fetcher).mock.calls[0] as unknown as [string, RequestInit])[1].body))).toMatchObject({
      app: 'intention',
    });
  });

  it('a refunded pass, or none, does not', async () => {
    const fetcher = vi.fn(async () => Response.json({ valid: false, status: 'refunded' })) as unknown as typeof fetch;
    const pass = { passOrigin: 'https://pass.example', serviceKey: 'k', app: 'intention-refunded', fetcher };
    expect(await hasLabPass(request({ 'X-Pass-Code': 'K7QM-XRP2-9VTD-4HNC', 'X-Device-Id': DEVICE }), testDb.db, { mode: 'test', pass })).toBe(false);
    expect(await hasLabPass(request({}), testDb.db, { mode: 'test', pass })).toBe(false);
    expect(await hasLabPass(request({ 'X-Pass-Code': 'K7QM-XRP2-9VTD-4HNC', 'X-Device-Id': DEVICE }), testDb.db, { mode: 'test' })).toBe(false);
  });
});
