import catalog from '../../config/products.json';

export type ProductId = 'report' | 'couple' | 'both';

export interface Product {
  id: string;
  name: string;
  /** Price in cents. */
  amount: number;
  currency: string;
}

/** Prices live in config/products.json. The functions read the same file. */
export function getProduct(id: ProductId): Product {
  const product = catalog.products.find((candidate) => candidate.id === id);
  if (!product) throw new Error(`No product ${id} in config/products.json`);
  return product;
}

/** "$9.99 once. No renewals." Every price we show says it is one-time. */
export function priceLine(product: Product): string {
  const amount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: product.currency.toUpperCase(),
  }).format(product.amount / 100);
  return `${amount} once. No renewals.`;
}
