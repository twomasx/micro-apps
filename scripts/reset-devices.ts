/**
 * Lets a code be used on new devices again, when its buyer has hit the 5-device limit honestly
 * (a new phone, cleared browser data). The code keeps working on every device afterwards as it is used.
 *
 *   pnpm --filter @micro/scripts reset-devices --app focus --code 7K3M-Q9TD-2XWB-HC4R [--staging]
 *   pnpm --filter @micro/scripts reset-devices --app pass --code K7QM-2XRP-9VTD-4HNC [--for-app attention] [--staging]
 */
import { SELLERS, type Seller } from './lib/catalog.ts';
import { hashOfTyped } from './lib/codes.ts';
import { d1, environmentFromArgs, HEX, quote } from './lib/d1.ts';
import { flag } from './lib/stripe.ts';

async function main() {
  const args = process.argv.slice(2);
  const app = flag(args, '--app') as Seller | undefined;
  if (!app || !SELLERS.includes(app) || app === 'personality') {
    throw new Error('Say which app: --app focus|breathwork|attention|intention|pass');
  }
  const typed = flag(args, '--code');
  const hash = typed ? await hashOfTyped(app, typed) : null;
  if (!hash) throw new Error(`Say which code: --code XXXX-XXXX-XXXX-XXXX (a ${app} code)`);
  const forApp = flag(args, '--for-app');
  if (forApp && !/^[a-z]{2,32}$/.test(forApp)) throw new Error('--for-app takes an app name');
  const environment = environmentFromArgs(args);

  const only = forApp ? ` AND app = '${forApp}'` : '';
  const before = d1<{ devices: number }>(app, environment, `SELECT COUNT(*) AS devices FROM code_devices WHERE code_hash = ${quote(hash, HEX)}${only}`);
  d1(app, environment, `DELETE FROM code_devices WHERE code_hash = ${quote(hash, HEX)}${only}`);
  console.log(`Cleared ${before[0]?.devices ?? 0} device(s) for this code${forApp ? ` in ${forApp}` : ''}.`);
}

await main();
