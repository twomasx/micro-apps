import { describe, expect, it, vi } from 'vitest';
import {
  createPassState,
  restoreCode,
  isPassActive,
  needsCheck,
  OFFLINE_GRACE_MS,
  RECHECK_AFTER_MS,
  sanitizePass,
  takePassToken,
  type PassAnswer,
  type PassStorage,
  type SavedPass,
} from './pass';

const CODE = 'K7QMXRP29VTD4HNC';
const DAY = 24 * 60 * 60 * 1000;

function memoryStorage(initial: Record<string, unknown> = {}): PassStorage & { data: Record<string, unknown> } {
  const data = { ...initial };
  return {
    data,
    get: async <T,>(key: string) => data[key] as T | undefined,
    set: async (key, value) => {
      data[key] = value;
    },
    delete: async (key) => {
      delete data[key];
    },
  };
}

/** A pass service that answers from a table, and api/payments that points at it. */
function service(answer: PassAnswer | Error, redeem?: { code: string } & PassAnswer) {
  const calls: { url: string; body: unknown }[] = [];
  const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, body: init?.body ? JSON.parse(String(init.body)) : null });
    if (url.endsWith('api/payments')) return Response.json({ passOrigin: 'https://pass.example' });
    if (url.endsWith('/pass/api/redeem')) return redeem ? Response.json(redeem) : new Response('gone', { status: 410 });
    if (answer instanceof Error) throw answer;
    return Response.json(answer);
  }) as unknown as typeof fetch;
  return { calls, fetcher };
}

const saved = (fields: Partial<SavedPass>): SavedPass => ({ code: CODE, status: 'active', checkedAt: 0, lastGoodAt: 0, ...fields });

describe('pass rules', () => {
  it('trusts an active answer for up to 7 days without the service', () => {
    const start = 1_000 * DAY;
    expect(isPassActive(saved({ lastGoodAt: start }), start + OFFLINE_GRACE_MS)).toBe(true);
    expect(isPassActive(saved({ lastGoodAt: start }), start + OFFLINE_GRACE_MS + 1)).toBe(false);
    expect(isPassActive(saved({ status: 'refunded', lastGoodAt: start }), start)).toBe(false);
    expect(isPassActive(null, start)).toBe(false);
  });

  it('asks again after a day', () => {
    expect(needsCheck(saved({ checkedAt: 0 }), RECHECK_AFTER_MS - 1)).toBe(false);
    expect(needsCheck(saved({ checkedAt: 0 }), RECHECK_AFTER_MS)).toBe(true);
  });

  it('reads only well-formed saved passes', () => {
    expect(sanitizePass({ code: 'k7qm-xrp2-9vtd-4hnc', status: 'active', checkedAt: 5, lastGoodAt: 5 })).toEqual(
      saved({ checkedAt: 5, lastGoodAt: 5 }),
    );
    expect(sanitizePass({ code: 'nope' })).toBeNull();
    expect(sanitizePass(null)).toBeNull();
    expect(sanitizePass({ code: CODE, status: 'weird' })?.status).toBe('unknown');
  });
});

describe('takePassToken', () => {
  it('reads the token and removes it from the address bar at once', () => {
    const replaceState = vi.fn();
    const win = {
      location: { href: 'https://polymadlabs.com/focus/?passToken=abcdefghijkmnpqrstuvwxyz&x=1#top' },
      history: { state: null, replaceState },
    } as unknown as Window;
    expect(takePassToken(win)).toBe('abcdefghijkmnpqrstuvwxyz');
    expect(replaceState).toHaveBeenCalledWith(null, '', '/focus/?x=1#top');
  });

  it('is null when there is none, and refuses a malformed one but still removes it', () => {
    const replaceState = vi.fn();
    const plain = { location: { href: 'https://x.test/focus/' }, history: { state: null, replaceState } } as unknown as Window;
    expect(takePassToken(plain)).toBeNull();
    expect(replaceState).not.toHaveBeenCalled();
    const bad = { location: { href: 'https://x.test/focus/?passToken=%3Cscript%3E' }, history: { state: null, replaceState } } as unknown as Window;
    expect(takePassToken(bad)).toBeNull();
    expect(replaceState).toHaveBeenCalledOnce();
  });
});

describe('createPassState', () => {
  const NOW = 2_000 * DAY;

  function state(storage: PassStorage, fetcher: typeof fetch, options: { now?: number; token?: string | null; online?: boolean } = {}) {
    return createPassState({
      app: 'focus',
      storage,
      baseUrl: `/focus-${Math.random()}/`,
      now: () => options.now ?? NOW,
      online: () => options.online ?? true,
      fetcher,
      takeToken: () => options.token ?? null,
    });
  }

  it('a pass checked today unlocks at once, without asking', async () => {
    const storage = memoryStorage({ 'focus:pass': saved({ checkedAt: NOW - 1000, lastGoodAt: NOW - 1000 }) });
    const { calls, fetcher } = service({ valid: true, status: 'active' });
    const pass = state(storage, fetcher);
    await pass.start();
    expect(pass.isActive()).toBe(true);
    expect(calls).toHaveLength(0);
  });

  it('after a day it asks again, with this app and its device id, and a refund takes the unlock away', async () => {
    const storage = memoryStorage({ 'focus:pass': saved({ checkedAt: NOW - DAY, lastGoodAt: NOW - DAY }) });
    const { calls, fetcher } = service({ valid: false, status: 'refunded' });
    const pass = state(storage, fetcher);
    await pass.start();
    expect(pass.isActive()).toBe(false);
    const verify = calls.find((call) => call.url === 'https://pass.example/pass/api/verify');
    expect(verify?.body).toMatchObject({ code: CODE, app: 'focus' });
    expect((verify?.body as { deviceId: string }).deviceId).toMatch(/^[a-z0-9]{20}$/);
    expect(storage.data['focus:pass']).toMatchObject({ status: 'refunded', checkedAt: NOW });
  });

  it('service down: keeps the last good answer for 7 days, then stops unlocking', async () => {
    const down = service(new TypeError('Failed to fetch'));
    const recent = memoryStorage({ 'focus:pass': saved({ checkedAt: NOW - 3 * DAY, lastGoodAt: NOW - 3 * DAY }) });
    const pass = state(recent, down.fetcher);
    await pass.start();
    expect(pass.isActive()).toBe(true);

    const old = memoryStorage({ 'focus:pass': saved({ checkedAt: NOW - 8 * DAY, lastGoodAt: NOW - 8 * DAY }) });
    const stale = state(old, down.fetcher);
    await stale.start();
    expect(stale.isActive()).toBe(false);
  });

  it('a one-time token from the pass pages saves the code with no typing', async () => {
    const storage = memoryStorage();
    const { calls, fetcher } = service({ valid: true, status: 'active' }, { code: CODE, valid: true, status: 'active' });
    const pass = state(storage, fetcher, { token: 'abcdefghijkmnpqrstuvwxyz' });
    const changes = vi.fn();
    pass.subscribe(changes);
    await pass.start();
    expect(pass.isActive()).toBe(true);
    expect(changes).toHaveBeenCalledOnce();
    expect(storage.data['focus:pass']).toMatchObject({ code: CODE, status: 'active' });
    expect(calls.find((call) => call.url.endsWith('/redeem'))?.body).toMatchObject({ token: 'abcdefghijkmnpqrstuvwxyz', app: 'focus' });
  });

  it('a used or expired token unlocks nothing', async () => {
    const storage = memoryStorage();
    const { fetcher } = service({ valid: true, status: 'active' });
    const pass = state(storage, fetcher, { token: 'abcdefghijkmnpqrstuvwxyz' });
    await pass.start();
    expect(pass.isActive()).toBe(false);
  });

  it('a typed code is checked, saved when known, and refused when not', async () => {
    const good = state(memoryStorage(), service({ valid: true, status: 'active' }).fetcher);
    expect(await good.useCode('k7qm-xrp2-9vtd-4hnc')).toBe('active');
    expect(good.isActive()).toBe(true);
    expect(good.code()).toBe(CODE);

    const unknown = memoryStorage();
    const missing = state(unknown, service({ valid: false, status: 'unknown' }).fetcher);
    expect(await missing.useCode(CODE)).toBe('unknown');
    expect(unknown.data['focus:pass']).toBeUndefined();

    const full = state(memoryStorage(), service({ valid: false, status: 'device_limit' }).fetcher);
    expect(await full.useCode(CODE)).toBe('device_limit');
    expect(full.isActive()).toBe(false);

    expect(await good.useCode('short')).toBe('malformed');
    expect(await state(memoryStorage(), service(new TypeError('offline')).fetcher).useCode(CODE)).toBe('offline');
  });
});

describe('restoreCode', () => {
  const pass = (result: Awaited<ReturnType<ReturnType<typeof createPassState>['useCode']>>) => ({ useCode: vi.fn(async () => result) });
  async function run(input: string, own: boolean | Error, passResult: Parameters<typeof pass>[0]) {
    const useOwn = vi.fn(async () => {});
    const passState = pass(passResult);
    const result = await restoreCode(input, {
      normalizeOwn: (value) => {
        const code = value.replace(/-/g, '').toUpperCase();
        return /^[0-9A-Z]{16}$/.test(code) ? code : null;
      },
      checkOwn: async () => {
        if (own instanceof Error) throw own;
        return own;
      },
      useOwn,
      pass: passState,
    });
    return { result, useOwn, passState };
  }

  it("uses the app's own code first", async () => {
    const { result, useOwn, passState } = await run('7K3M-Q9TD-2XWB-HC4R', true, 'unknown');
    expect(result).toBe('own');
    expect(useOwn).toHaveBeenCalledWith('7K3MQ9TD2XWBHC4R');
    expect(passState.useCode).not.toHaveBeenCalled();
  });

  it('then tries the code as a pass code', async () => {
    expect((await run(CODE, false, 'active')).result).toBe('pass');
    expect((await run(CODE, false, 'unknown')).result).toBe('invalid');
    expect((await run(CODE, false, 'refunded')).result).toBe('refunded');
    expect((await run(CODE, false, 'device_limit')).result).toBe('device_limit');
  });

  it('says malformed or offline', async () => {
    expect((await run('short', false, 'malformed')).result).toBe('malformed');
    expect((await run(CODE, new TypeError('offline'), 'active')).result).toBe('offline');
  });
});
