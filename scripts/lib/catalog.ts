import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Product } from '@micro/payments';

export const REPO = fileURLToPath(new URL('../../', import.meta.url));

/** Every app that sells something, and the pass. Each one's prices live in apps/<app>/config/products.json. */
export const SELLERS = ['personality', 'focus', 'breathwork', 'attention', 'intention', 'pass'] as const;
export type Seller = (typeof SELLERS)[number];

/** The products of one app, from its config/products.json. Empty when the app has none yet. */
export function productsOf(app: Seller): Product[] {
  const path = `${REPO}apps/${app}/config/products.json`;
  if (!existsSync(path)) return [];
  return (JSON.parse(readFileSync(path, 'utf8')) as { products: Product[] }).products;
}

/** "$9.99" */
export function money(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(amount / 100);
}
