import { describe, expect, it } from 'vitest';
import { differences, madeOn, type StripeSale } from './reconcile.ts';

const sale = (fields: Partial<StripeSale> & { sessionId: string }): StripeSale => ({
  app: 'focus',
  successUrl: 'https://polymadlabs.com/focus/unlock?session_id={CHECKOUT_SESSION_ID}',
  paid: true,
  refunded: false,
  disputed: false,
  ...fields,
});

describe('differences', () => {
  it('is empty when Stripe and our rows agree', () => {
    expect(
      differences(
        [sale({ sessionId: 'a' }), sale({ sessionId: 'b', refunded: true }), sale({ sessionId: 'c', disputed: true, refunded: true })],
        [
          { app: 'focus', sessionId: 'a', status: 'paid' },
          { app: 'focus', sessionId: 'b', status: 'refunded' },
          { app: 'focus', sessionId: 'c', status: 'disputed' },
          { app: 'focus', sessionId: 'never-paid', status: 'pending' },
        ],
      ),
    ).toEqual([]);
  });

  it('finds a paid sale we never unlocked, or left pending', () => {
    expect(differences([sale({ sessionId: 'a' })], [])).toEqual(['focus a: Stripe says paid, no row in our database']);
    expect(differences([sale({ sessionId: 'a' })], [{ app: 'focus', sessionId: 'a', status: 'pending' }])).toEqual([
      'focus a: Stripe says paid, our row says pending',
    ]);
  });

  it('finds a refund we did not revoke', () => {
    expect(differences([sale({ sessionId: 'a', refunded: true })], [{ app: 'focus', sessionId: 'a', status: 'paid' }])).toEqual([
      'focus a: Stripe says refunded, our row says paid',
    ]);
  });

  it('finds an unlock with no sale behind it', () => {
    expect(differences([], [{ app: 'pass', sessionId: 'x', status: 'paid' }])).toEqual([
      'pass x: our row says paid, but Stripe has no completed sale for it in this period',
    ]);
    expect(differences([sale({ sessionId: 'y', paid: false })], [{ app: 'focus', sessionId: 'y', status: 'paid' }])).toEqual([
      'focus y: Stripe says not paid, our row says paid',
    ]);
  });
});

describe('madeOn', () => {
  it('tells staging sales from production ones by the address Stripe sends buyers back to', () => {
    const staging = sale({ sessionId: 's', successUrl: 'https://staging.polymadlabs.com/pass/thanks?session_id=x' });
    const production = sale({ sessionId: 'p' });
    expect(madeOn(staging, 'staging')).toBe(true);
    expect(madeOn(staging, 'production')).toBe(false);
    expect(madeOn(production, 'production')).toBe(true);
    expect(madeOn(production, 'staging')).toBe(false);
  });
});
