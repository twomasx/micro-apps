/**
 * Codes work like keys: anyone holding one gets in. These rules keep that safe enough for one-time purchases
 * without accounts (PAYMENTS.md section 3b):
 * - a code works on up to 5 devices per app (each app sends its anonymous device id with every check),
 * - every check counts toward a limit per network address: 10 a minute and 100 a day, wrong codes included,
 * - each code remembers, per day, a scrambled form of the addresses it was checked from, so the reconcile
 *   script can list codes used from many places.
 * Network addresses are never stored as they are: only an HMAC with a server secret, which cannot be read back.
 */
import { hmac } from '../unlock-codes';
import { SERVICE_KEY_HEADER, CLIENT_IP_HEADER } from './pass-check';

export const DEVICE_LIMIT = 5;
export const PER_MINUTE = 10;
export const PER_DAY = 100;

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;
const DEVICE_ID = /^[a-z0-9]{12,64}$/;

/** The anonymous device id a request carries in X-Device-Id, or null. */
export function deviceIdOf(request: Request): string | null {
  const id = request.headers.get('X-Device-Id');
  return id && DEVICE_ID.test(id) ? id : null;
}

/**
 * The buyer's network address. App servers that ask on the buyer's behalf (with the shared service key)
 * pass it on in X-Client-IP; for everyone else it is the address Cloudflare saw.
 */
export function clientAddress(request: Request, serviceKey: string | undefined): string {
  const forwarded = request.headers.get(CLIENT_IP_HEADER);
  if (forwarded && serviceKey && request.headers.get(SERVICE_KEY_HEADER) === serviceKey) return forwarded;
  return request.headers.get('CF-Connecting-IP') ?? 'unknown';
}

/** A scrambled network address: the first 16 hex characters of an HMAC with a server secret. */
export async function addressHash(secret: string, address: string): Promise<string> {
  const bytes = await hmac(secret, `address:${address}`);
  return Array.from(bytes.subarray(0, 8), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export interface RateAnswer {
  ok: boolean;
  /** Seconds until a try is allowed again, when not ok. */
  retryAfter: number;
}

/** Counts one try from this address. Not ok after 10 in a minute or 100 in a day. */
export async function countTry(db: D1Database, address: string, now = Date.now()): Promise<RateAnswer> {
  const minute = Math.floor(now / MINUTE_MS);
  const day = Math.floor(now / DAY_MS);
  const upsert = `INSERT INTO rate_limits (key, count, expires_ms) VALUES (?, 1, ?)
    ON CONFLICT (key) DO UPDATE SET count = count + 1 RETURNING count`;
  const statements = [
    db.prepare(upsert).bind(`m:${address}:${minute}`, (minute + 2) * MINUTE_MS),
    db.prepare(upsert).bind(`d:${address}:${day}`, (day + 2) * DAY_MS),
  ];
  // Now and then, clear counters that no longer matter.
  if (Math.random() < 0.02) statements.push(db.prepare('DELETE FROM rate_limits WHERE expires_ms < ?').bind(now));
  const [perMinute, perDay] = await db.batch<{ count: number }>(statements);
  const minuteCount = perMinute?.results[0]?.count ?? 0;
  const dayCount = perDay?.results[0]?.count ?? 0;
  if (dayCount > PER_DAY) return { ok: false, retryAfter: Math.ceil(((day + 1) * DAY_MS - now) / 1000) };
  if (minuteCount > PER_MINUTE) return { ok: false, retryAfter: Math.ceil(((minute + 1) * MINUTE_MS - now) / 1000) };
  return { ok: true, retryAfter: 0 };
}

/** What a rate-limited request gets. */
export function tooManyTries(answer: RateAnswer, headers: Record<string, string> = {}): Response {
  return Response.json(
    { error: 'too_many_tries', message: 'Too many tries from this network. Wait a minute and try again.' },
    { status: 429, headers: { 'Cache-Control': 'no-store', 'Retry-After': String(answer.retryAfter), ...headers } },
  );
}

/**
 * Lets this device use the code in this app, unless 5 other devices already do.
 * A device that used the code before is always let in again.
 */
export async function admitDevice(
  db: D1Database,
  codeHash: string,
  app: string,
  deviceId: string,
  now = Date.now(),
): Promise<'ok' | 'device_limit'> {
  const at = new Date(now).toISOString();
  const known = await db
    .prepare('UPDATE code_devices SET last_seen = ? WHERE code_hash = ? AND app = ? AND device_id = ?')
    .bind(at, codeHash, app, deviceId)
    .run();
  if (known.meta.changes > 0) return 'ok';

  const count = await db
    .prepare('SELECT COUNT(*) AS devices FROM code_devices WHERE code_hash = ? AND app = ?')
    .bind(codeHash, app)
    .first<number>('devices');
  if ((count ?? 0) >= DEVICE_LIMIT) return 'device_limit';
  await db
    .prepare(
      `INSERT OR IGNORE INTO code_devices (code_hash, app, device_id, first_seen, last_seen) VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(codeHash, app, deviceId, at, at)
    .run();
  return 'ok';
}

/** Remembers that this code was checked from this (scrambled) address today. */
export async function noteAddress(db: D1Database, codeHash: string, hashedAddress: string, now = Date.now()): Promise<void> {
  await db
    .prepare('INSERT OR IGNORE INTO code_addresses (code_hash, day, address_hash) VALUES (?, ?, ?)')
    .bind(codeHash, new Date(now).toISOString().slice(0, 10), hashedAddress)
    .run();
}
