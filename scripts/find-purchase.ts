/**
 * Finds a buyer's purchases by the email they gave Stripe and prints each one's current code, so Roger can send
 * a lost code back. There is no self-serve lookup, because anyone could type someone else's email.
 *
 *   export STRIPE_SECRET_KEY=...
 *   pnpm --filter @micro/scripts find-purchase --email buyer@example.com [--staging]
 *
 * The email is only sent to Stripe. Nothing is stored. Code secrets come from ~/.config/polymadlabs.
 */
import { SELLERS, type Seller } from './lib/catalog.ts';
import { codeFor } from './lib/codes.ts';
import { d1, environmentFromArgs, quote, SESSION_ID } from './lib/d1.ts';
import { codeSecret } from './lib/secrets.ts';
import { flag, modeFromKey, stripeFor } from './lib/stripe.ts';

async function main() {
  const args = process.argv.slice(2);
  const email = flag(args, '--email');
  if (!email || !email.includes('@')) throw new Error('Say whose purchases: --email buyer@example.com');
  const environment = environmentFromArgs(args);
  const mode = modeFromKey();
  const stripe = stripeFor(mode);

  const sessions = await stripe.checkout.sessions.list({ customer_details: { email }, status: 'complete', limit: 100 });
  if (sessions.data.length === 0) console.log('No completed purchases for this email in Stripe.');
  type Row = { status: string; code_generation?: number; result_id?: string; partner_result_id?: string | null };
  const lookup = (app: Seller, sessionId: string) =>
    d1<Row>(app, environment, `SELECT * FROM purchases WHERE stripe_session_id = ${quote(sessionId, SESSION_ID)} AND mode = '${mode}'`)[0];

  for (const session of sessions.data) {
    // Staging and production share the Stripe test account. Staging sales return to a staging. address.
    const staging = session.success_url ? new URL(session.success_url).hostname.startsWith('staging.') : false;
    if (staging !== (environment === 'staging')) continue;
    let app = session.metadata?.app as Seller | undefined;
    let row: Row | undefined;
    if (app && (SELLERS as readonly string[]).includes(app)) row = lookup(app, session.id);
    else {
      // Sessions made before the app was recorded: ask every app's database.
      for (const candidate of SELLERS) {
        row = lookup(candidate, session.id);
        if (row) {
          app = candidate;
          break;
        }
      }
    }
    const when = new Date(session.created * 1000).toISOString().slice(0, 10);
    const head = `${when}  ${app ?? 'unknown app'}  ${session.metadata?.productId ?? ''}  ${session.payment_status}  ${session.id}`;
    if (!app || !(SELLERS as readonly string[]).includes(app)) {
      console.log(`${head}\n  Not found in any of our ${environment} databases.`);
      continue;
    }
    if (!row) {
      console.log(`${head}\n  No row in the ${environment} ${app} database.`);
      continue;
    }
    if (app === 'personality') {
      const pair = row.partner_result_id ? ` and ${row.partner_result_id}` : '';
      console.log(`${head}\n  Status ${row.status}. Unlocks result ${row.result_id}${pair}: polymadlabs.com/personality/r/${row.result_id}`);
      continue;
    }
    const code = await codeFor(app, codeSecret(app, environment), session.id, row.code_generation ?? 0);
    console.log(`${head}\n  Status ${row.status}. Code: ${code}`);
  }
}

await main();
