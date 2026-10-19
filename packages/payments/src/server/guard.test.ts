import { describe, expect, it } from 'vitest';
import schema from '../../test/schema.sql?raw';
import { createTestDb } from '../../test/db';
import { clientAddress, forgetOldRecords, ROUTER_KEY_HEADER, VISITOR_IP_HEADER } from './guard';
import { CLIENT_IP_HEADER, SERVICE_KEY_HEADER } from './pass-check';

const ROUTER_KEY = 'r'.repeat(64);
const SERVICE_KEY = 's'.repeat(64);

function request(headers: Record<string, string>): Request {
  return new Request('https://micro-focus.pages.dev/api/unlock/X', { headers });
}

describe('clientAddress', () => {
  // Behind the router every request arrives from Cloudflare's own address.
  const fromRouter = { 'CF-Connecting-IP': '2a06:98c0:3600::103' };

  it('takes the visitor address the router passed on with the right key', () => {
    const sent = request({ ...fromRouter, [VISITOR_IP_HEADER]: '203.0.113.7', [ROUTER_KEY_HEADER]: ROUTER_KEY });
    expect(clientAddress(sent, undefined, ROUTER_KEY)).toBe('203.0.113.7');
  });

  it('ignores a visitor address with a wrong or missing key', () => {
    expect(clientAddress(request({ ...fromRouter, [VISITOR_IP_HEADER]: '203.0.113.7', [ROUTER_KEY_HEADER]: 'guess' }), undefined, ROUTER_KEY)).toBe(
      '2a06:98c0:3600::103',
    );
    expect(clientAddress(request({ ...fromRouter, [VISITOR_IP_HEADER]: '203.0.113.7' }), undefined, ROUTER_KEY)).toBe('2a06:98c0:3600::103');
    // No key set here: nothing is trusted.
    expect(clientAddress(request({ ...fromRouter, [VISITOR_IP_HEADER]: '203.0.113.7', [ROUTER_KEY_HEADER]: '' }), undefined, undefined)).toBe(
      '2a06:98c0:3600::103',
    );
  });

  it('prefers the buyer address an app server passed on with the service key', () => {
    const sent = request({
      ...fromRouter,
      [CLIENT_IP_HEADER]: '198.51.100.9',
      [SERVICE_KEY_HEADER]: SERVICE_KEY,
      [VISITOR_IP_HEADER]: '203.0.113.7',
      [ROUTER_KEY_HEADER]: ROUTER_KEY,
    });
    expect(clientAddress(sent, SERVICE_KEY, ROUTER_KEY)).toBe('198.51.100.9');
  });
});

describe('forgetOldRecords', () => {
  it('deletes device ids, addresses and log entries older than a year, and keeps newer ones', async () => {
    const testDb = await createTestDb(schema);
    const { db } = testDb;
    try {
      const now = Date.parse('2027-06-01T12:00:00Z');
      const old = '2026-05-31T12:00:00.000Z';
      const recent = '2026-06-02T12:00:00.000Z';
      await db.batch([
        db.prepare('INSERT INTO code_devices (code_hash, app, device_id, first_seen, last_seen) VALUES (?, ?, ?, ?, ?)').bind('h', 'focus', 'olddevice0001', old, old),
        db.prepare('INSERT INTO code_devices (code_hash, app, device_id, first_seen, last_seen) VALUES (?, ?, ?, ?, ?)').bind('h', 'focus', 'newdevice0001', old, recent),
        db.prepare('INSERT INTO code_addresses (code_hash, day, address_hash) VALUES (?, ?, ?)').bind('h', old.slice(0, 10), 'a'),
        db.prepare('INSERT INTO code_addresses (code_hash, day, address_hash) VALUES (?, ?, ?)').bind('h', recent.slice(0, 10), 'b'),
        db.prepare("INSERT INTO payment_log (at, app, mode, action, result) VALUES (?, 'focus', 'live', 'checkout', 'started')").bind(old),
        db.prepare("INSERT INTO payment_log (at, app, mode, action, result) VALUES (?, 'focus', 'live', 'checkout', 'started')").bind(recent),
      ]);
      await db.batch(forgetOldRecords(db, now));
      const left = async (sql: string) => (await db.prepare(sql).all()).results;
      expect(await left('SELECT device_id FROM code_devices')).toEqual([{ device_id: 'newdevice0001' }]);
      expect(await left('SELECT address_hash FROM code_addresses')).toEqual([{ address_hash: 'b' }]);
      expect(await left('SELECT at FROM payment_log')).toEqual([{ at: recent }]);
    } finally {
      await testDb.dispose();
    }
  });
});
