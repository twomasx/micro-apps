import { describe, expect, it, vi } from 'vitest';
import { requestHasPass } from './pass-check';

const CODE = 'K7QM-XRP2-9VTD-4HNC';
const DEVICE = 'abcdefghijkm23456789';

function request(headers: Record<string, string>) {
  return new Request('https://polymadlabs.com/personality/api/results/x/report', {
    headers: { 'CF-Connecting-IP': '203.0.113.9', ...headers },
  });
}

function service(valid: boolean | Error) {
  return vi.fn(async () => {
    if (valid instanceof Error) throw valid;
    return Response.json({ valid, status: valid ? 'active' : 'refunded' });
  }) as unknown as typeof fetch;
}

describe('requestHasPass', () => {
  it('asks the pass service with the code, device, app, service key and the buyer address', async () => {
    const fetcher = service(true);
    const ok = await requestHasPass(request({ 'X-Pass-Code': CODE, 'X-Device-Id': DEVICE }), {
      passOrigin: 'https://pass.example',
      serviceKey: 'key',
      app: 'personality',
      fetcher,
      now: () => 1,
    });
    expect(ok).toBe(true);
    const [url, init] = vi.mocked(fetcher).mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://pass.example/pass/api/verify');
    expect(JSON.parse(String(init.body))).toEqual({ code: 'K7QMXRP29VTD4HNC', deviceId: DEVICE, app: 'personality' });
    expect(init.headers).toMatchObject({ 'X-Pass-Service-Key': 'key', 'X-Client-IP': '203.0.113.9' });
  });

  it('keeps an answer for a minute', async () => {
    const fetcher = service(true);
    const options = { passOrigin: 'https://pass.example', serviceKey: 'k', app: 'cache-test', fetcher };
    const headers = { 'X-Pass-Code': CODE, 'X-Device-Id': DEVICE };
    await requestHasPass(request(headers), { ...options, now: () => 0 });
    await requestHasPass(request(headers), { ...options, now: () => 59_000 });
    expect(fetcher).toHaveBeenCalledTimes(1);
    await requestHasPass(request(headers), { ...options, now: () => 60_000 });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('says no without a well-formed code and device, without a pass service, when refused, or when the service is down', async () => {
    const options = { passOrigin: 'https://pass.example', serviceKey: 'k', fetcher: service(true) };
    expect(await requestHasPass(request({}), { ...options, app: 'a' })).toBe(false);
    expect(await requestHasPass(request({ 'X-Pass-Code': 'nope', 'X-Device-Id': DEVICE }), { ...options, app: 'b' })).toBe(false);
    expect(await requestHasPass(request({ 'X-Pass-Code': CODE }), { ...options, app: 'c' })).toBe(false);
    expect(await requestHasPass(request({ 'X-Pass-Code': CODE, 'X-Device-Id': DEVICE }), { ...options, passOrigin: '', app: 'd' })).toBe(false);
    expect(
      await requestHasPass(request({ 'X-Pass-Code': CODE, 'X-Device-Id': DEVICE }), { ...options, fetcher: service(false), app: 'e' }),
    ).toBe(false);
    expect(
      await requestHasPass(request({ 'X-Pass-Code': CODE, 'X-Device-Id': DEVICE }), { ...options, fetcher: service(new Error('down')), app: 'f' }),
    ).toBe(false);
  });
});
