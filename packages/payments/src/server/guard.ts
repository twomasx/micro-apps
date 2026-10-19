/**
 * Codes work like keys: anyone holding one gets in. These rules keep that safe enough for one-time purchases
 * without accounts (PAYMENTS.md section 3b):
 * - a code works on up to 5 devices per app (each app sends its anonymous device id with every check),
 * - every check counts toward a limit per network address: 10 a minute and 100 a day, wrong codes included,
 *   counted under the scrambled address (addressHash), so the rate_limits table never holds an address either,
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

/** Set by the router (router/src/index.ts) on every request it forwards: the visitor's address and ROUTER_KEY. */
export const VISITOR_IP_HEADER = 'X-Visitor-IP';
export const ROUTER_KEY_HEADER = 'X-Router-Key';

/**
 * The buyer's network address.
 * - App servers that ask on the buyer's behalf (with the shared service key) pass it on in X-Client-IP.
 * - The router passes it on in X-Visitor-IP with ROUTER_KEY. It has to: the router is on polymadlabs.com and the
 *   apps on pages.dev, and in a request from a Worker to another zone Cloudflare sets CF-Connecting-IP to its own
 *   address, the same for every visitor. Without this every visitor would share one rate limit.
 * - Anyone else (a direct request to pages.dev, local dev): the address Cloudflare saw.
 */
export function clientAddress(request: Request, serviceKey: string | undefined, routerKey?: string): string {
  const forwarded = request.headers.get(CLIENT_IP_HEADER);
  if (forwarded && serviceKey && request.headers.get(SERVICE_KEY_HEADER) === serviceKey) return forwarded;
  const visitor = request.headers.get(VISITOR_IP_HEADER);
  if (visitor && routerKey && request.headers.get(ROUTER_KEY_HEADER) === routerKey) return visitor;
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

/** Device ids, scrambled addresses and log entries are kept for up to this long (the pass privacy page says 1 year). */
export const RECORDS_KEPT_MS = 365 * DAY_MS;

/** Deletes device ids not seen, addresses not checked and log entries not written in the last year. */
export function forgetOldRecords(db: D1Database, now = Date.now()): D1PreparedStatement[] {
  const cutoff = new Date(now - RECORDS_KEPT_MS).toISOString();
  return [
    db.prepare('DELETE FROM code_devices WHERE last_seen < ?').bind(cutoff),
    db.prepare('DELETE FROM code_addresses WHERE day < ?').bind(cutoff.slice(0, 10)),
    db.prepare('DELETE FROM payment_log WHERE at < ?').bind(cutoff),
  ];
}

/** How many tries one address gets. Each kind of try has its own name, so its counters are separate. */
export interface RateLimits {
  name: string;
  perMinute: number;
  perDay: number;
}

/** Code checks: 10 a minute and 100 a day from one address. */
export const CODE_CHECKS: RateLimits = { name: '', perMinute: PER_MINUTE, perDay: PER_DAY };

/** Counts one try from this address, scrambled with addressHash. Not ok past the limits (code checks by default). */
export async function countTry(
  db: D1Database,
  hashedAddress: string,
  now = Date.now(),
  limits: RateLimits = CODE_CHECKS,
): Promise<RateAnswer> {
  const minute = Math.floor(now / MINUTE_MS);
  const day = Math.floor(now / DAY_MS);
  const prefix = limits.name ? `${limits.name}:` : '';
  const upsert = `INSERT INTO rate_limits (key, count, expires_ms) VALUES (?, 1, ?)
    ON CONFLICT (key) DO UPDATE SET count = count + 1 RETURNING count`;
  const statements = [
    db.prepare(upsert).bind(`${prefix}m:${hashedAddress}:${minute}`, (minute + 2) * MINUTE_MS),
    db.prepare(upsert).bind(`${prefix}d:${hashedAddress}:${day}`, (day + 2) * DAY_MS),
  ];
  // Now and then, clear counters that no longer matter, and records past the year the privacy pages promise.
  if (Math.random() < 0.02) {
    statements.push(db.prepare('DELETE FROM rate_limits WHERE expires_ms < ?').bind(now), ...forgetOldRecords(db, now));
  }
  const [perMinute, perDay] = await db.batch<{ count: number }>(statements);
  const minuteCount = perMinute?.results[0]?.count ?? 0;
  const dayCount = perDay?.results[0]?.count ?? 0;
  if (dayCount > limits.perDay) return { ok: false, retryAfter: Math.ceil(((day + 1) * DAY_MS - now) / 1000) };
  if (minuteCount > limits.perMinute) return { ok: false, retryAfter: Math.ceil(((minute + 1) * MINUTE_MS - now) / 1000) };
  return { ok: true, retryAfter: 0 };
}

/** What an endpoint needs to count tries per address: the secret the address is scrambled with, and the router key. */
export interface AddressLimit {
  secret: string;
  routerKey?: string;
  limits: RateLimits;
}

/** Counts this request against its address. Returns the 429 to send when it is over the limits, or null. */
export async function refuseOverLimit(request: Request, db: D1Database, limit: AddressLimit, now = Date.now()): Promise<Response | null> {
  const address = await addressHash(limit.secret, clientAddress(request, undefined, limit.routerKey));
  const answer = await countTry(db, address, now, limit.limits);
  return answer.ok ? null : tooManyTries(answer);
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
