import { describe, expect, it } from 'vitest';
import { clientAddress, ROUTER_KEY_HEADER, VISITOR_IP_HEADER } from './guard';
import { CLIENT_IP_HEADER, SERVICE_KEY_HEADER } from './pass-check';

const ROUTER_KEY = 'r'.repeat(64);
const SERVICE_KEY = 's'.repeat(64);

function request(headers: Record<string, string>): Request {
  return new Request('https://micro-focus.pages.dev/api/unlock/X', { headers });
}

describe('clientAddress', () => {
  // Behind the router every request arrives from Cloudflare's own address.
  const fromRouter = { 'CF-Connecting-IP': '2a06:98c0:3600::103' };

  it('takes the visitor address the router passed on with the right key', () => {
    const sent = request({ ...fromRouter, [VISITOR_IP_HEADER]: '203.0.113.7', [ROUTER_KEY_HEADER]: ROUTER_KEY });
    expect(clientAddress(sent, undefined, ROUTER_KEY)).toBe('203.0.113.7');
  });

  it('ignores a visitor address with a wrong or missing key', () => {
    expect(clientAddress(request({ ...fromRouter, [VISITOR_IP_HEADER]: '203.0.113.7', [ROUTER_KEY_HEADER]: 'guess' }), undefined, ROUTER_KEY)).toBe(
      '2a06:98c0:3600::103',
    );
    expect(clientAddress(request({ ...fromRouter, [VISITOR_IP_HEADER]: '203.0.113.7' }), undefined, ROUTER_KEY)).toBe('2a06:98c0:3600::103');
    // No key set here: nothing is trusted.
    expect(clientAddress(request({ ...fromRouter, [VISITOR_IP_HEADER]: '203.0.113.7', [ROUTER_KEY_HEADER]: '' }), undefined, undefined)).toBe(
      '2a06:98c0:3600::103',
    );
  });

  it('prefers the buyer address an app server passed on with the service key', () => {
    const sent = request({
      ...fromRouter,
      [CLIENT_IP_HEADER]: '198.51.100.9',
      [SERVICE_KEY_HEADER]: SERVICE_KEY,
      [VISITOR_IP_HEADER]: '203.0.113.7',
      [ROUTER_KEY_HEADER]: ROUTER_KEY,
    });
    expect(clientAddress(sent, SERVICE_KEY, ROUTER_KEY)).toBe('198.51.100.9');
  });
});
