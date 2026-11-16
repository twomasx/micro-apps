import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import type { Seller } from './catalog.ts';
import type { Environment } from './d1.ts';

/**
 * The secret an app's codes are made from, read from Roger's machine (~/.config/polymadlabs), never the repo.
 */
export function codeSecret(app: Seller, environment: Environment): string {
  const staging = environment === 'staging' ? 'staging-' : '';
  const name = app === 'pass' ? `pass-${staging}code-secret` : `${app}-${staging}unlock-code-secret`;
  return readFileSync(`${homedir()}/.config/polymadlabs/${name}`, 'utf8').trim();
}
