import passCatalog from '../../../pass/config/products.json';

/** "Or get every app for $19.99 once." The price comes from the pass service's config/products.json. */
export function passOfferLine(): string {
  const pass = passCatalog.products[0]!;
  const amount = new Intl.NumberFormat('en-US', { style: 'currency', currency: pass.currency.toUpperCase() }).format(pass.amount / 100);
  return `Or get every app for ${amount} once.`;
}
