import { describe, expect, it } from 'vitest';
import { appHref } from './navigation';

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
