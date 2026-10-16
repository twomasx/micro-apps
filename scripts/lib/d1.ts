import { execFileSync } from 'node:child_process';
import { REPO, type Seller } from './catalog.ts';

export type Environment = 'production' | 'staging';

/** `--staging` picks the staging databases. Production is the default. */
export function environmentFromArgs(args: string[]): Environment {
  return args.includes('--staging') ? 'staging' : 'production';
}

/**
 * Runs SQL on an app's remote D1 database with wrangler, as Roger is logged in to it.
 * Values in the SQL must already be checked with `quote`; wrangler takes no bound parameters here.
 */
export function d1<T = Record<string, unknown>>(app: Seller, environment: Environment, sql: string): T[] {
  const args = ['exec', 'wrangler', 'd1', 'execute', 'DB', '--remote', '--json', '--command', sql];
  if (environment === 'staging') args.push('--env', 'preview');
  const output = execFileSync('pnpm', args, {
    cwd: `${REPO}apps/${app}`,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 64 * 1024 * 1024,
  });
  const parsed = JSON.parse(output.slice(output.indexOf('['))) as { results: T[] }[];
  return parsed.flatMap((part) => part.results);
}

/** A value for SQL, after checking it has the expected shape. Never pass text from elsewhere unchecked. */
export function quote(value: string, pattern: RegExp): string {
  if (!pattern.test(value)) throw new Error(`Refusing an unexpected value: ${value}`);
  return `'${value}'`;
}

export const SESSION_ID = /^cs_(test|live)_[A-Za-z0-9]{10,250}$/;
export const HEX = /^[0-9a-f]{64}$/;
export const DAY = /^\d{4}-\d{2}-\d{2}$/;
