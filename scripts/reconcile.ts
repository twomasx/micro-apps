/**
 * Compares every completed Stripe Checkout sale in a date range with every purchases row (each app and the pass),
 * and prints anything missing or different on either side. Also lists codes that look shared.
 *
 *   export STRIPE_SECRET_KEY=...      # the key of the mode to check (test now, live after go-live)
 *   pnpm --filter @micro/scripts reconcile --from 2026-10-16 [--to 2026-10-23] [--staging]
 *
 * Run it after each test session and daily for the first week of live sales. Exit code 1 means differences.
 */
import type Stripe from 'stripe';
import { SELLERS, type Seller } from './lib/catalog.ts';
import { d1, DAY, environmentFromArgs, quote } from './lib/d1.ts';
import { differences, madeOn, type SaleRow, type StripeSale } from './lib/reconcile.ts';
import { flag, modeFromKey, stripeFor } from './lib/stripe.ts';

const ADDRESSES_A_DAY = 10;

async function stripeSales(stripe: Stripe, from: Date, to: Date): Promise<StripeSale[]> {
  const sales: StripeSale[] = [];
  const list = stripe.checkout.sessions.list({
    created: { gte: Math.floor(from.getTime() / 1000), lt: Math.floor(to.getTime() / 1000) },
    status: 'complete',
    limit: 100,
    expand: ['data.payment_intent.latest_charge'],
  });
  for await (const session of list) {
    const intent = typeof session.payment_intent === 'object' ? session.payment_intent : null;
    const charge = intent && typeof intent.latest_charge === 'object' ? intent.latest_charge : null;
    sales.push({
      sessionId: session.id,
      successUrl: session.success_url,
      app: session.metadata?.app ?? null,
      paid: session.payment_status === 'paid',
      refunded: charge?.refunded ?? false,
      disputed: charge?.disputed ?? false,
    });
  }
  return sales;
}

async function main() {
  const args = process.argv.slice(2);
  const fromText = flag(args, '--from');
  if (!fromText || !DAY.test(fromText)) throw new Error('Say where to start: --from 2026-10-16');
  const toText = flag(args, '--to') ?? new Date().toISOString().slice(0, 10);
  if (!DAY.test(toText)) throw new Error('--to must look like 2026-10-23');
  const from = new Date(`${fromText}T00:00:00Z`);
  const to = new Date(new Date(`${toText}T00:00:00Z`).getTime() + 24 * 60 * 60 * 1000);
  const environment = environmentFromArgs(args);
  const mode = modeFromKey();
  const stripe = stripeFor(mode);

  console.log(`Reconciling ${environment}, ${mode} mode, ${fromText} to ${toText}.`);
  const sales = await stripeSales(stripe, from, to);
  const rows: SaleRow[] = [];
  const range = `created_at >= ${quote(fromText, DAY)} AND created_at < ${quote(to.toISOString().slice(0, 10), DAY)}`;
  for (const app of SELLERS) {
    const found = d1<{ stripe_session_id: string; status: string }>(
      app,
      environment,
      `SELECT stripe_session_id, status FROM purchases WHERE mode = '${mode}' AND ${range}`,
    );
    rows.push(...found.map((row) => ({ app, sessionId: row.stripe_session_id, status: row.status })));
  }

  // Every app gets every event on the account, so a sale belongs to the app whose table has it.
  const ours = sales.filter(
    (sale) => madeOn(sale, environment) && (sale.app === null || (SELLERS as readonly string[]).includes(sale.app)),
  );
  const problems = differences(ours, rows);
  console.log(`${ours.length} completed Stripe sales, ${rows.length} rows in our databases.`);
  if (problems.length === 0) console.log('No mismatches.');
  for (const problem of problems) console.log(`MISMATCH  ${problem}`);

  // Sharing alerts.
  const alerts: string[] = [];
  for (const app of SELLERS.filter((name): name is Exclude<Seller, 'personality'> => name !== 'personality')) {
    const full = d1<{ stripe_session_id: string; for_app: string; devices: number }>(
      app,
      environment,
      `SELECT p.stripe_session_id, d.app AS for_app, COUNT(*) AS devices FROM code_devices d
       JOIN purchases p ON p.unlock_code_hash = d.code_hash GROUP BY d.code_hash, d.app HAVING COUNT(*) >= 5`,
    );
    for (const row of full) alerts.push(`${app} ${row.stripe_session_id}: in use on ${row.devices} devices in ${row.for_app} (the limit)`);
    const spread = d1<{ stripe_session_id: string; day: string; places: number }>(
      app,
      environment,
      `SELECT p.stripe_session_id, a.day, COUNT(*) AS places FROM code_addresses a
       JOIN purchases p ON p.unlock_code_hash = a.code_hash
       WHERE a.day >= ${quote(fromText, DAY)} GROUP BY a.code_hash, a.day HAVING COUNT(*) >= ${ADDRESSES_A_DAY}`,
    );
    for (const row of spread) alerts.push(`${app} ${row.stripe_session_id}: checked from ${row.places} network addresses on ${row.day}`);
  }
  if (alerts.length === 0) console.log('No codes look shared.');
  for (const alert of alerts) console.log(`SHARING   ${alert}`);
  console.log('Reissue a leaked code with: pnpm --filter @micro/scripts reissue-code --app <app> --session <session id>');

  if (problems.length > 0) process.exit(1);
}

await main();
