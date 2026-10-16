import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { REPO } from './lib/catalog.ts';

const SITES = ['personality', 'focus', 'breathwork', 'attention', 'intention', 'pass', 'landing'];

describe('page security headers', () => {
  for (const site of SITES) {
    it(`${site} allows scripts only from itself and sends no referrer`, () => {
      const headers = readFileSync(`${REPO}apps/${site}/public/_headers`, 'utf8');
      expect(headers).toMatch(/^\/\*$/m);
      expect(headers).toContain("Content-Security-Policy: script-src 'self'; object-src 'none'");
      expect(headers).not.toMatch(/script-src[^\n]*(unsafe|https?:|\*)/);
      expect(headers).toContain('Referrer-Policy: no-referrer');
    });
  }
});
