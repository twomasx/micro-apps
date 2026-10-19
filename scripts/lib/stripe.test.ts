import { describe, expect, it } from 'vitest';
import { webhookEnvironment } from './stripe.ts';

describe('webhookEnvironment', () => {
  it('points test-mode webhooks at staging and live-mode webhooks at production', () => {
    expect(webhookEnvironment('https://staging.polymadlabs.com', 'test')).toBe('staging');
    expect(webhookEnvironment('https://polymadlabs.com/', 'live')).toBe('production');
  });

  it('refuses test webhooks on production and live webhooks on staging', () => {
    expect(() => webhookEnvironment('https://polymadlabs.com', 'test')).toThrow(/staging only/);
    expect(() => webhookEnvironment('https://staging.polymadlabs.com', 'live')).toThrow(/production only/);
  });

  it('reads the hostname, not any part of the address', () => {
    expect(() => webhookEnvironment('https://polymadlabs.com/staging.x', 'test')).toThrow(/staging only/);
  });
});
