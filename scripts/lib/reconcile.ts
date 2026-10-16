/** What Stripe says about one completed Checkout session. */
export interface StripeSale {
  sessionId: string;
  /** Where Stripe sent the buyer back. Staging and production share the test account, so this tells them apart. */
  successUrl: string | null;
  /** metadata.app; null for sessions made before the app was recorded. */
  app: string | null;
  paid: boolean;
  /** The whole amount went back to the buyer. */
  refunded: boolean;
  disputed: boolean;
}

/** One row of an app's purchases table (or the pass service's). */
export interface SaleRow {
  app: string;
  sessionId: string;
  status: string;
}

/** What the database should say about a sale, from Stripe's side. */
export function expectedStatus(sale: StripeSale): 'paid' | 'refunded' | 'disputed' | null {
  if (!sale.paid) return null;
  if (sale.disputed) return 'disputed';
  if (sale.refunded) return 'refunded';
  return 'paid';
}

/**
 * Every difference between Stripe and our databases, in plain words. Empty means they agree.
 * Rows still pending are compared too: a paid sale left pending means a webhook was missed.
 */
export function differences(sales: StripeSale[], rows: SaleRow[]): string[] {
  const problems: string[] = [];
  const bySession = new Map(rows.map((row) => [row.sessionId, row]));
  const seen = new Set<string>();

  for (const sale of sales) {
    const expected = expectedStatus(sale);
    const row = bySession.get(sale.sessionId);
    if (row) seen.add(row.sessionId);
    if (expected === null) {
      if (row && row.status !== 'pending') problems.push(`${row.app} ${sale.sessionId}: Stripe says not paid, our row says ${row.status}`);
      continue;
    }
    if (!row) {
      problems.push(`${sale.app ?? 'unknown app'} ${sale.sessionId}: Stripe says ${expected}, no row in our database`);
    } else if (row.status !== expected) {
      problems.push(`${row.app} ${sale.sessionId}: Stripe says ${expected}, our row says ${row.status}`);
    }
  }

  for (const row of rows) {
    if (seen.has(row.sessionId) || row.status === 'pending') continue;
    problems.push(`${row.app} ${row.sessionId}: our row says ${row.status}, but Stripe has no completed sale for it in this period`);
  }
  return problems;
}

/** True when the sale was made on this environment: staging sales return to a staging. address. */
export function madeOn(sale: StripeSale, environment: 'production' | 'staging'): boolean {
  if (!sale.successUrl) return environment === 'production';
  const staging = new URL(sale.successUrl).hostname.startsWith('staging.');
  return environment === 'staging' ? staging : !staging;
}
