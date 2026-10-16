import { describe, expect, it } from 'vitest';
import { isStagingHost } from './client';

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
