/**
 * Replaces a leaked code: the old one stops working on its next check, everywhere, and a new one is printed for
 * Roger to send the buyer. The purchase itself does not change.
 *
 *   pnpm --filter @micro/scripts reissue-code --app focus --session cs_live_... [--staging]
 *   pnpm --filter @micro/scripts reissue-code --app pass --code K7QM-2XRP-9VTD-4HNC [--staging]
 *
 * Code secrets come from ~/.config/polymadlabs. Uses wrangler, logged in as Roger.
 */
import { SELLERS, type Seller } from './lib/catalog.ts';
import { codeFor, hashOfTyped } from './lib/codes.ts';
import { d1, environmentFromArgs, HEX, quote, SESSION_ID } from './lib/d1.ts';
import { codeSecret } from './lib/secrets.ts';
import { flag } from './lib/stripe.ts';
import { hashCode } from '@micro/payments/unlock-codes';

async function main() {
  const args = process.argv.slice(2);
  const app = flag(args, '--app') as Seller | undefined;
  if (!app || !SELLERS.includes(app) || app === 'personality') {
    throw new Error('Say which app: --app focus|breathwork|attention|intention|pass (personality has no codes)');
  }
  const environment = environmentFromArgs(args);
  const session = flag(args, '--session');
  const typed = flag(args, '--code');
  let where: string;
  if (session) where = `stripe_session_id = ${quote(session, SESSION_ID)}`;
  else if (typed) {
    const hash = await hashOfTyped(app, typed);
    if (!hash) throw new Error(`That is not a ${app} code.`);
    where = `unlock_code_hash = ${quote(hash, HEX)}`;
  } else throw new Error('Say which purchase: --session cs_... or --code XXXX-XXXX-XXXX-XXXX');

  const rows = d1<{ stripe_session_id: string; status: string; code_generation: number; unlock_code_hash: string }>(
    app,
    environment,
    `SELECT stripe_session_id, status, code_generation, unlock_code_hash FROM purchases WHERE ${where}`,
  );
  const row = rows[0];
  if (!row) throw new Error('No such purchase.');
  if (row.status !== 'paid') throw new Error(`This purchase is ${row.status}, so it has no working code to replace.`);

  const generation = row.code_generation + 1;
  const code = await codeFor(app, codeSecret(app, environment), row.stripe_session_id, generation);
  const newHash = await hashCode(code.replace(/-/g, ''));
  const oldHash = quote(row.unlock_code_hash, HEX);
  const sid = quote(row.stripe_session_id, SESSION_ID);
  // A pass's one-time tokens made with the old code would otherwise still hand out the new one.
  const unusedTokens = app === 'pass' ? `DELETE FROM pass_tokens WHERE stripe_session_id = ${sid};` : '';
  d1(
    app,
    environment,
    `UPDATE purchases SET code_generation = ${generation}, unlock_code_hash = ${quote(newHash, HEX)}, updated_at = '${new Date().toISOString()}'
       WHERE stripe_session_id = ${sid} AND code_generation = ${row.code_generation};
     DELETE FROM code_devices WHERE code_hash = ${oldHash};
     ${unusedTokens}
     INSERT INTO payment_log (at, app, mode, action, session_id, result, detail)
       SELECT '${new Date().toISOString()}', '${app}', mode, 'reissue', stripe_session_id, 'reissued', 'generation ${generation}'
       FROM purchases WHERE stripe_session_id = ${sid};`,
  );
  console.log(`${app} ${row.stripe_session_id}: the old code no longer works.`);
  console.log(`New code (generation ${generation}): ${code}`);
}

await main();
