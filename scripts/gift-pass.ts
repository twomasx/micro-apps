/**
 * Makes all-app pass codes for Roger to give away (friends, family, testers). A gift pass works exactly like a
 * bought one, device cap included, and can be revoked or reissued the same way (reissue-code --code ...). It has no
 * Stripe sale: its row's session id is `gift_` plus random letters, it costs 0, and reconcile leaves it alone.
 * No names are stored, so keep your own note of who got which code.
 *
 *   pnpm --filter @micro/scripts gift-pass [--count 2] [--staging]
 *
 * Code secrets come from ~/.config/polymadlabs. Uses wrangler, logged in as Roger.
 */
import { randomBytes } from 'node:crypto';
import { codeFor } from './lib/codes.ts';
import { d1, environmentFromArgs, GIFT_PREFIX, HEX, quote, SESSION_ID } from './lib/d1.ts';
import { codeSecret } from './lib/secrets.ts';
import { flag } from './lib/stripe.ts';
import { hashCode } from '@micro/payments/unlock-codes';

const LETTERS = 'abcdefghijklmnopqrstuvwxyz0123456789';
const random = (length: number) => [...randomBytes(length)].map((byte) => LETTERS[byte % LETTERS.length]).join('');

async function main() {
  const args = process.argv.slice(2);
  const count = Number(flag(args, '--count') ?? 1);
  if (!Number.isInteger(count) || count < 1 || count > 20) throw new Error('--count is a whole number from 1 to 20.');
  const environment = environmentFromArgs(args);
  // Production sells in live mode and staging in test mode (CLAUDE.md, Payments); a row only counts in its own mode.
  const mode = environment === 'production' ? 'live' : 'test';
  const secret = codeSecret('pass', environment);
  const now = new Date().toISOString();

  const codes: string[] = [];
  const statements: string[] = [];
  for (let i = 0; i < count; i++) {
    const sessionId = quote(`${GIFT_PREFIX}${random(24)}`, SESSION_ID);
    const code = await codeFor('pass', secret, sessionId.slice(1, -1), 0);
    const hash = quote(await hashCode(code.replace(/-/g, '')), HEX);
    codes.push(code);
    statements.push(
      `INSERT INTO purchases (id, stripe_session_id, unlock_code_hash, amount_cents, currency, status, mode, code_generation, created_at)
         VALUES ('${random(16)}', ${sessionId}, ${hash}, 0, 'usd', 'paid', '${mode}', 0, '${now}');`,
      `INSERT INTO payment_log (at, app, mode, action, product, session_id, result, detail)
         VALUES ('${now}', 'pass', '${mode}', 'gift', 'pass', ${sessionId}, 'paid', 'gift pass');`,
    );
  }
  d1('pass', environment, statements.join('\n'));
  console.log(`${count} gift pass${count === 1 ? '' : 'es'} on ${environment} (${mode} mode). Each unlocks every app, up to 5 devices per app:`);
  for (const code of codes) console.log(`  ${code}`);
}

await main();
