import { describe, expect, it, vi } from 'vitest';
import { appHref, onPageRestored } from './navigation';

const base = import.meta.env.BASE_URL;

describe('appHref', () => {
  it('gives every page its trailing slash and keeps the query and hash', () => {
    expect(appHref('')).toBe(base);
    expect(appHref('science')).toBe(`${base}science/`);
    expect(appHref('/privacy/')).toBe(`${base}privacy/`);
    expect(appHref('science#deep')).toBe(`${base}science/#deep`);
    expect(appHref('unlock?session_id=cs_test_1')).toBe(`${base}unlock/?session_id=cs_test_1`);
    expect(appHref('?preset=deep')).toBe(`${base}?preset=deep`);
  });
});

describe('onPageRestored', () => {
  const pageshow = (persisted: boolean) => Object.assign(new Event('pageshow'), { persisted });

  it('calls back only when the page comes back from the back-forward cache, until stopped', () => {
    const target = new EventTarget() as unknown as Window;
    const onReturn = vi.fn();
    const stop = onPageRestored(onReturn, target);
    target.dispatchEvent(pageshow(false));
    expect(onReturn).not.toHaveBeenCalled();
    target.dispatchEvent(pageshow(true));
    expect(onReturn).toHaveBeenCalledTimes(1);
    stop();
    target.dispatchEvent(pageshow(true));
    expect(onReturn).toHaveBeenCalledTimes(1);
  });
});
