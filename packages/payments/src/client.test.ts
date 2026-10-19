import { describe, expect, it } from 'vitest';
import { forgetCheckoutInAddress, isStagingHost } from './client';

describe('isStagingHost', () => {
  it('is true only for staging addresses', () => {
    expect(isStagingHost('staging.polymadlabs.com')).toBe(true);
    expect(isStagingHost('staging.micro-focus.pages.dev')).toBe(true);
    expect(isStagingHost('polymadlabs.com')).toBe(false);
    expect(isStagingHost('www.polymadlabs.com')).toBe(false);
    expect(isStagingHost('micro-focus.pages.dev')).toBe(false);
    expect(isStagingHost('localhost')).toBe(false);
  });
});

describe('forgetCheckoutInAddress', () => {
  function fakeWindow(href: string) {
    const calls: string[] = [];
    const win = {
      location: { href } as Location,
      history: { state: { sheet: null }, replaceState: (_state: unknown, _title: string, url: string) => calls.push(url) } as unknown as History,
    };
    return { win, calls };
  }

  it('drops session_id and keeps the rest of the address', () => {
    const { win, calls } = fakeWindow('https://polymadlabs.com/focus/unlock?session_id=cs_live_abc&x=1#top');
    forgetCheckoutInAddress(undefined, win);
    expect(calls).toEqual(['/focus/unlock?x=1#top']);
  });

  it('can send a reload to another page', () => {
    const { win, calls } = fakeWindow('https://polymadlabs.com/pass/thanks?session_id=cs_live_abc');
    forgetCheckoutInAddress('/pass/', win);
    expect(calls).toEqual(['/pass/']);
  });

  it('leaves an address without a checkout id alone', () => {
    const { win, calls } = fakeWindow('https://polymadlabs.com/focus/unlock');
    forgetCheckoutInAddress(undefined, win);
    expect(calls).toEqual([]);
  });
});
