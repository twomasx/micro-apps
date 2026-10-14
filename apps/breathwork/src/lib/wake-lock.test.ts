import { describe, expect, it, vi } from 'vitest';
import { createWakeLock, type WakeLockApi } from './wake-lock';

function fakeApi() {
  const sentinels: { release: ReturnType<typeof vi.fn>; fire: () => void }[] = [];
  let refuse = false;
  let pending: (() => void) | null = null;
  let delay = false;
  const api: WakeLockApi = {
    request: vi.fn<WakeLockApi['request']>(() => {
      if (refuse) return Promise.reject(new Error('NotAllowedError'));
      let onRelease = () => {};
      const sentinel = {
        release: vi.fn(() => Promise.resolve()),
        addEventListener: (_type: 'release', listener: () => void) => {
          onRelease = listener;
        },
        fire: () => onRelease(),
      };
      sentinels.push(sentinel);
      if (!delay) return Promise.resolve(sentinel);
      return new Promise<typeof sentinel>((resolve) => {
        pending = () => resolve(sentinel);
      });
    }),
  };
  return {
    api,
    sentinels,
    refuse: () => (refuse = true),
    delay: () => (delay = true),
    land: () => pending?.(),
  };
}

describe('wake lock', () => {
  it('says unsupported, and does nothing, where the API is missing', async () => {
    const lock = createWakeLock(null);
    expect(await lock.acquire()).toBe('unsupported');
    await lock.release();
    expect(lock.status).toBe('unsupported');
  });

  it('holds the screen on and lets go on release', async () => {
    const fake = fakeApi();
    const lock = createWakeLock(fake.api);
    const changes: string[] = [];
    lock.subscribe((status) => changes.push(status));
    expect(await lock.acquire()).toBe('on');
    await lock.release();
    expect(fake.sentinels[0]!.release).toHaveBeenCalledOnce();
    expect(lock.status).toBe('off');
    expect(changes).toEqual(['on', 'off']);
  });

  it('asks only once while it holds the lock', async () => {
    const fake = fakeApi();
    const lock = createWakeLock(fake.api);
    await lock.acquire();
    await lock.acquire();
    expect(fake.api.request).toHaveBeenCalledOnce();
  });

  it('notices when the browser drops the lock, and can ask again', async () => {
    const fake = fakeApi();
    const lock = createWakeLock(fake.api);
    await lock.acquire();
    fake.sentinels[0]!.fire();
    expect(lock.status).toBe('off');
    expect(await lock.acquire()).toBe('on');
  });

  it('reports a refusal without throwing', async () => {
    const fake = fakeApi();
    fake.refuse();
    const lock = createWakeLock(fake.api);
    expect(await lock.acquire()).toBe('refused');
  });

  it('lets go of a lock that arrives after release was asked for', async () => {
    const fake = fakeApi();
    fake.delay();
    const lock = createWakeLock(fake.api);
    const acquiring = lock.acquire();
    await lock.release();
    fake.land();
    await acquiring;
    expect(fake.sentinels[0]!.release).toHaveBeenCalledOnce();
    expect(lock.status).toBe('off');
  });
});
