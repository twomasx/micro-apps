import { describe, expect, it } from 'vitest';
import { passOfferLine } from './pass-offer.ts';

describe('passOfferLine', () => {
  it('offers the pass at its one-time price', () => {
    expect(passOfferLine()).toBe('Or get every app for $19.99 once.');
  });
});
