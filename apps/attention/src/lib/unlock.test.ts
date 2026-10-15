import { describe, expect, it, vi } from 'vitest';
import { CONFIRM_ATTEMPTS, confirmPurchase, refreshUnlock, sanitizeUnlock, type SavedUnlock } from './unlock';

const CODE = '7K3M-Q9TD-2XWB-HC4R';

function deps(saved: SavedUnlock | null, options: { online?: boolean; check?: () => Promise<boolean> } = {}) {
  const applied: boolean[] = [];
  const save = vi.fn<(unlock: SavedUnlock) => Promise<void>>(async () => {});
  return {
    applied,
    save,
    run: () =>
      refreshUnlock({
        load: async () => saved,
        save,
        check: options.check ?? (async () => true),
        online: () => options.online ?? true,
        now: () => 5000,
        apply: (unlocked) => applied.push(unlocked),
      }),
  };
}

describe('refreshUnlock', () => {
  it('does nothing without a saved code', async () => {
    const d = deps(null);
    await d.run();
    expect(d.applied).toEqual([]);
  });

  it('trusts the last answer while offline', async () => {
    const d = deps({ code: CODE, valid: true, checkedAt: 1 }, { online: false });
    await d.run();
    expect(d.applied).toEqual([true]);
    expect(d.save).not.toHaveBeenCalled();
  });

  it('keeps the last answer when the server cannot be reached', async () => {
    const d = deps({ code: CODE, valid: true, checkedAt: 1 }, { check: () => Promise.reject(new Error('offline')) });
    await d.run();
    expect(d.applied).toEqual([true]);
  });

  it('follows the server when it changes its answer, and saves when it checked', async () => {
    const d = deps({ code: CODE, valid: true, checkedAt: 1 }, { check: async () => false });
    await d.run();
    expect(d.applied).toEqual([true, false]);
    expect(d.save).toHaveBeenCalledWith({ code: CODE, valid: false, checkedAt: 5000 });
  });
});

describe('sanitizeUnlock', () => {
  it('keeps a well-formed saved code and drops anything else', () => {
    expect(sanitizeUnlock({ code: CODE, valid: true, checkedAt: 3 })).toEqual({ code: CODE, valid: true, checkedAt: 3 });
    expect(sanitizeUnlock({ code: 'nope', valid: true })).toBeNull();
    expect(sanitizeUnlock(null)).toBeNull();
    expect(sanitizeUnlock({ code: CODE, valid: 'yes' })?.valid).toBe(false);
  });
});

describe('confirmPurchase', () => {
  const run = (answers: (() => Promise<{ paid: true; code: string } | { paid: false }>)[]) => {
    let call = 0;
    const wait = vi.fn(async () => {});
    const result = confirmPurchase('cs_test_x', {
      fetchPurchase: () => (answers[Math.min(call++, answers.length - 1)] ?? answers[0]!)(),
      wait,
      cancelled: () => false,
    });
    return { result, wait, calls: () => call };
  };

  it('returns the code once the server says paid', async () => {
    const r = run([async () => ({ paid: false }), async () => ({ paid: true, code: CODE })]);
    expect(await r.result).toEqual({ kind: 'paid', code: CODE });
    expect(r.calls()).toBe(2);
  });

  it('gives up for now after a few tries', async () => {
    const r = run([async () => ({ paid: false })]);
    expect(await r.result).toEqual({ kind: 'pending' });
    expect(r.calls()).toBe(CONFIRM_ATTEMPTS);
  });

  it('tells an unknown payment apart from a network failure', async () => {
    expect(await run([() => Promise.reject(Object.assign(new Error('x'), { status: 404 }))]).result).toEqual({
      kind: 'notFound',
    });
    expect(await run([() => Promise.reject(new TypeError('Failed to fetch'))]).result).toEqual({ kind: 'offline' });
  });
});
