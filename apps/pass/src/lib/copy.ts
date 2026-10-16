import { CONTACT_EMAIL } from '@micro/payments/contact';
import catalog from '../../config/products.json';

export const PASS = catalog.products[0]!;

/** "$19.99 once. No renewals." Every price we show says it is one-time. */
export function priceLine(): string {
  const amount = new Intl.NumberFormat('en-US', { style: 'currency', currency: PASS.currency.toUpperCase() }).format(PASS.amount / 100);
  return `${amount} once. No renewals.`;
}

export const SAVE_CODE_LINE = 'Save this code to unlock every PolymadLabs app on any device.';

export const TERMS = [
  'The pass covers every app operated by PolymadLabs, including new ones.',
  'If an app is ever sold or spun off, its own single-app purchases move with it. Pass holders keep access for as long as PolymadLabs runs the app.',
];

export const CONTACT_LINE = `Lost your code, or something does not work? Write to ${CONTACT_EMAIL}.`;
export { CONTACT_EMAIL };
