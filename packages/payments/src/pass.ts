/**
 * The all-app pass, as every app sees it in the browser. Import from '@micro/payments/pass'.
 *
 * Nothing here depends on the apps sharing a domain. Each app keeps its own copy of the pass code in its
 * own storage (`<app>:pass`) and asks the pass service whether it is still good. It trusts the last answer
 * for 24 hours, then asks again, so refunds and disputes take effect within a day. If the service cannot
 * be reached, it keeps the last good answer for up to 7 days.
 */
import { loadPaymentsStatus } from './client';
import { CONTACT_EMAIL } from './contact';
import { normalizePassCode, PASS_TOKEN_PARAM } from './pass-codes';

export { DEVICE_HEADER, PASS_HEADER, PASS_TOKEN_PARAM } from './pass-codes';

export type PassStatus = 'active' | 'refunded' | 'disputed' | 'unknown' | 'device_limit';

export interface PassAnswer {
  valid: boolean;
  status: PassStatus;
}

export interface SavedPass {
  /** Normalized, without dashes. */
  code: string;
  /** The service's last answer. */
  status: PassStatus;
  /** When the service last answered, in ms since 1970. */
  checkedAt: number;
  /** When the service last said active. */
  lastGoodAt: number;
}

export const RECHECK_AFTER_MS = 24 * 60 * 60 * 1000;
export const OFFLINE_GRACE_MS = 7 * 24 * 60 * 60 * 1000;


const STATUSES: readonly PassStatus[] = ['active', 'refunded', 'disputed', 'unknown', 'device_limit'];

export function sanitizePass(raw: unknown): SavedPass | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const saved = raw as Record<string, unknown>;
  const code = typeof saved.code === 'string' ? normalizePassCode(saved.code) : null;
  if (!code) return null;
  const number = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : 0);
  return {
    code,
    status: STATUSES.includes(saved.status as PassStatus) ? (saved.status as PassStatus) : 'unknown',
    checkedAt: number(saved.checkedAt),
    lastGoodAt: number(saved.lastGoodAt),
  };
}

/** True while the pass unlocks this app: the last answer was active and not more than 7 days old. */
export function isPassActive(saved: SavedPass | null, now: number): boolean {
  return saved !== null && saved.status === 'active' && now - saved.lastGoodAt <= OFFLINE_GRACE_MS;
}

/** True when the last answer is a day old or more. */
export function needsCheck(saved: SavedPass, now: number): boolean {
  return now - saved.checkedAt >= RECHECK_AFTER_MS;
}

/** The saved pass after an answer from the service. */
export function withAnswer(saved: SavedPass, answer: PassAnswer, now: number): SavedPass {
  return { ...saved, status: answer.status, checkedAt: now, lastGoodAt: answer.valid ? now : saved.lastGoodAt };
}

export class PassServiceError extends Error {
  override name = 'PassServiceError';
  constructor(readonly status: number) {
    super(`The pass service answered ${status}`);
  }
}

async function post<T>(url: string, body: unknown, fetcher: typeof fetch): Promise<T> {
  const response = await fetcher(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
    // No cookies, nothing that identifies the person: the code and an anonymous device id are all it needs.
    credentials: 'omit',
  });
  if (!response.ok) throw new PassServiceError(response.status);
  return (await response.json()) as T;
}

export interface PassRequest {
  code: string;
  deviceId: string;
  app: string;
}

/** POST <passOrigin>/pass/api/verify. Throws when the service cannot be reached or refuses (rate limit). */
export function verifyPass(passOrigin: string, request: PassRequest, fetcher: typeof fetch = fetch): Promise<PassAnswer> {
  return post<PassAnswer>(`${passOrigin}/pass/api/verify`, request, fetcher);
}

/** POST <passOrigin>/pass/api/redeem: trades a one-time token for the pass code. Null for a used or expired token. */
export async function redeemPassToken(
  passOrigin: string,
  request: { token: string; deviceId: string; app: string },
  fetcher: typeof fetch = fetch,
): Promise<{ code: string; answer: PassAnswer } | null> {
  try {
    const body = await post<{ code: string } & PassAnswer>(`${passOrigin}/pass/api/redeem`, request, fetcher);
    return { code: body.code, answer: { valid: body.valid, status: body.status } };
  } catch (error) {
    if (error instanceof PassServiceError && (error.status === 404 || error.status === 410)) return null;
    throw error;
  }
}

/**
 * Reads ?passToken= from the address and removes it right away, before it is used,
 * so it never stays in history, a bookmark or a shared link.
 */
export function takePassToken(win: Pick<Window, 'location' | 'history'> = window): string | null {
  const url = new URL(win.location.href);
  const token = url.searchParams.get(PASS_TOKEN_PARAM);
  if (token === null) return null;
  url.searchParams.delete(PASS_TOKEN_PARAM);
  win.history.replaceState(win.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  return /^[a-z0-9]{20,64}$/.test(token) ? token : null;
}

/** The parts of the app's storage this needs (AppStorage from @micro/platform fits). */
export interface PassStorage {
  get<T>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
}

const DEVICE_ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';
const DEVICE_PATTERN = /^[a-z0-9]{12,64}$/;

/** A random, anonymous id: 20 characters, 100 bits. It means nothing outside this app on this device. */
export function newDeviceId(): string {
  let id = '';
  for (const byte of crypto.getRandomValues(new Uint8Array(20))) id += DEVICE_ALPHABET[byte & 31];
  return id;
}

/** This app's device id, kept as `<app>:device`. Made on first use. If storage is blocked, it lasts for this visit. */
export async function loadDeviceId(storage: PassStorage, app: string): Promise<string> {
  const key = `${app}:device`;
  try {
    const saved = await storage.get<unknown>(key);
    if (typeof saved === 'string' && DEVICE_PATTERN.test(saved)) return saved;
  } catch {
    // Storage is blocked. Fall through to a fresh id.
  }
  const id = newDeviceId();
  try {
    await storage.set(key, id);
  } catch {
    // Kept in memory for this visit.
  }
  return id;
}

export interface PassStateOptions {
  /** The app's name, like "focus". */
  app: string;
  storage: PassStorage;
  /** import.meta.env.BASE_URL, to find api/payments and with it the pass service. */
  baseUrl: string;
  now?: () => number;
  online?: () => boolean;
  fetcher?: typeof fetch;
  /** Reads and removes ?passToken= from the address. */
  takeToken?: () => string | null;
}

export type UseCodeResult = PassStatus | 'malformed' | 'offline' | 'rate_limited';

/**
 * The pass for one app on this device: whether it is active now, kept up to date with the service.
 * One per page load. The app's unlock check is "its own purchase or this".
 */
export function createPassState(options: PassStateOptions) {
  const { app, storage, baseUrl } = options;
  const now = options.now ?? (() => Date.now());
  const online = options.online ?? (() => navigator.onLine);
  const fetcher = options.fetcher ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  const takeToken = options.takeToken ?? (() => takePassToken());
  const key = `${app}:pass`;

  let saved: SavedPass | null = null;
  let active = false;
  let device: Promise<string> | null = null;
  const listeners = new Set<() => void>();

  const deviceId = () => (device ??= loadDeviceId(storage, app));
  const passOrigin = async () => (await loadPaymentsStatus(baseUrl, fetcher))?.passOrigin ?? '';

  function update(next: SavedPass | null) {
    saved = next;
    const nextActive = isPassActive(next, now());
    if (nextActive === active) return;
    active = nextActive;
    for (const listener of listeners) listener();
  }

  async function save(next: SavedPass | null) {
    update(next);
    try {
      if (next) await storage.set(key, next);
      else await storage.delete(key);
    } catch {
      // Kept for this visit. The code can be entered again on the restore page.
    }
  }

  async function load(): Promise<SavedPass | null> {
    try {
      return sanitizePass(await storage.get<unknown>(key));
    } catch {
      return null;
    }
  }

  let started: Promise<void> | null = null;

  return {
    isActive: () => active,
    /** The saved code, for app servers that check the pass themselves. Null when there is none. */
    code: () => saved?.code ?? null,
    saved: () => saved,
    deviceId,

    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    /** Once per page load: take a one-time token if the address has one, use the saved answer, ask again when due. */
    start(): Promise<void> {
      started ??= (async () => {
        const token = takeToken();
        if (token) {
          try {
            const redeemed = await redeemPassToken(await passOrigin(), { token, deviceId: await deviceId(), app }, fetcher);
            if (redeemed) {
              const at = now();
              await save({ code: redeemed.code, status: redeemed.answer.status, checkedAt: at, lastGoodAt: redeemed.answer.valid ? at : 0 });
              return;
            }
          } catch {
            // The service could not be reached. The code can still be typed on the restore page.
          }
        }

        const current = await load();
        update(current);
        if (!current || !needsCheck(current, now()) || !online()) return;
        try {
          const answer = await verifyPass(await passOrigin(), { code: current.code, deviceId: await deviceId(), app }, fetcher);
          await save(withAnswer(current, answer, now()));
        } catch {
          // Keep the last good answer for up to 7 days. isPassActive applies the limit.
        }
      })();
      return started;
    },

    /** A pass code typed on a restore screen. Saved unless the service has never heard of it. */
    async useCode(input: string): Promise<UseCodeResult> {
      const code = normalizePassCode(input);
      if (!code) return 'malformed';
      let answer: PassAnswer;
      try {
        answer = await verifyPass(await passOrigin(), { code, deviceId: await deviceId(), app }, fetcher);
      } catch (error) {
        return isRateLimited(error) ? 'rate_limited' : 'offline';
      }
      if (answer.status === 'unknown') return 'unknown';
      const at = now();
      await save({ code, status: answer.status, checkedAt: at, lastGoodAt: answer.valid ? at : 0 });
      return answer.status;
    },

    /** Forgets the pass on this device. */
    forget: () => save(null),
  };
}

export type PassState = ReturnType<typeof createPassState>;

/** What a restore screen says after a pass code was tried. */
export const PASS_MESSAGES: Record<Exclude<UseCodeResult, 'active'>, string> = {
  malformed: 'A pass code has 16 letters and numbers, like K7QM-2XRP-9VTD-4HNC.',
  unknown: 'This code was not found. Check it and try again.',
  refunded: 'This pass was refunded, so it no longer unlocks anything.',
  disputed: 'This pass was disputed, so it no longer unlocks anything.',
  device_limit: `This code is already in use on 5 devices. Contact us at ${CONTACT_EMAIL} if that's wrong.`,
  offline: 'We could not reach the server. Check your connection and try again.',
  rate_limited: 'Too many tries from this network. Wait a minute and try again.',
};

/** True for an error from a request that was refused for too many tries (429). */
export function isRateLimited(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { status?: unknown }).status === 429;
}

export type RestoreResult =
  | 'own'
  | 'pass'
  | 'malformed'
  | 'invalid'
  | 'offline'
  | 'rate_limited'
  | 'refunded'
  | 'disputed'
  | 'device_limit';

export interface RestoreDeps {
  /** The app's own code check: normalizes what was typed, or null when it cannot be one of its codes. */
  normalizeOwn: (input: string) => string | null;
  /** Asks the app's server about its own code. 'device_limit' when it is in use on 5 other devices. */
  checkOwn: (code: string) => Promise<boolean | 'device_limit'>;
  /** Saves the app's own code on this device. */
  useOwn: (code: string) => Promise<void>;
  pass: Pick<PassState, 'useCode'>;
}

/**
 * What an app's restore box does with a code: first the app's own unlock code, then the all-app pass.
 * One box takes both, because every pass code character is also an unlock code character.
 */
export async function restoreCode(input: string, deps: RestoreDeps): Promise<RestoreResult> {
  const own = deps.normalizeOwn(input);
  if (own) {
    let valid: boolean | 'device_limit';
    try {
      valid = await deps.checkOwn(own);
    } catch (error) {
      return isRateLimited(error) ? 'rate_limited' : 'offline';
    }
    if (valid === 'device_limit') return 'device_limit';
    if (valid) {
      await deps.useOwn(own);
      return 'own';
    }
  }
  const result = await deps.pass.useCode(input);
  switch (result) {
    case 'active':
      return 'pass';
    case 'unknown':
    case 'malformed':
      return own ? 'invalid' : 'malformed';
    default:
      return result;
  }
}
