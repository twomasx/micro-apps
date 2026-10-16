import { DEVICE_HEADER, normalizePassCode, PASS_HEADER } from '../pass-codes';

/** Sent by app servers, so the pass service counts its rate limit against the buyer's address, not ours. */
export const SERVICE_KEY_HEADER = 'X-Pass-Service-Key';
export const CLIENT_IP_HEADER = 'X-Client-IP';

export interface ServerPassOptions {
  /** PASS_API_ORIGIN. Empty means no pass service is set up here (local dev): nothing is unlocked by a pass. */
  passOrigin: string;
  /** PASS_SERVICE_KEY, shared with the pass service of the same environment. */
  serviceKey: string | undefined;
  /** The app asking, like "personality". */
  app: string;
  fetcher?: typeof fetch;
  now?: () => number;
}

const DEVICE_PATTERN = /^[a-z0-9]{12,64}$/;
const CACHE_MS = 60_000;
const cache = new Map<string, { valid: boolean; at: number }>();

/**
 * True when the request carries an active all-app pass (headers X-Pass-Code and X-Device-Id), as the pass
 * service says. For paid content checked on the server (personality's reports, intention's Lab Pass routes).
 * Answers are kept for a minute per code and device, so a page with several requests asks once.
 * If the service cannot be reached the answer is no: paid text is never sent on a guess.
 */
export async function requestHasPass(request: Request, options: ServerPassOptions): Promise<boolean> {
  const code = normalizePassCode(request.headers.get(PASS_HEADER) ?? '');
  const deviceId = request.headers.get(DEVICE_HEADER) ?? '';
  if (!code || !DEVICE_PATTERN.test(deviceId) || !options.passOrigin) return false;

  const now = (options.now ?? Date.now)();
  const key = `${options.app}|${code}|${deviceId}`;
  const cached = cache.get(key);
  if (cached && now - cached.at < CACHE_MS) return cached.valid;

  let valid: boolean;
  try {
    const response = await (options.fetcher ?? fetch)(`${options.passOrigin}/pass/api/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [SERVICE_KEY_HEADER]: options.serviceKey ?? '',
        [CLIENT_IP_HEADER]: request.headers.get('CF-Connecting-IP') ?? '',
      },
      body: JSON.stringify({ code, deviceId, app: options.app }),
    });
    valid = response.ok && ((await response.json()) as { valid?: unknown }).valid === true;
  } catch {
    valid = false;
  }
  cache.set(key, { valid, at: now });
  if (cache.size > 1_000) cache.delete(cache.keys().next().value as string);
  return valid;
}
