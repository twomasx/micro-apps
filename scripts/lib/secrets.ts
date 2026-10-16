import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import type { Seller } from './catalog.ts';
import type { Environment } from './d1.ts';

/**
 * The secret an app's codes are made from, read from Roger's machine (~/.config/polymadlabs), never the repo.
 * Personality has no codes.
 */
export function codeSecret(app: Seller, environment: Environment): string {
  if (app === 'personality') throw new Error('Personality has no unlock codes');
  const staging = environment === 'staging' ? 'staging-' : '';
  const name = app === 'pass' ? `pass-${staging}code-secret` : `${app}-${staging}unlock-code-secret`;
  return readFileSync(`${homedir()}/.config/polymadlabs/${name}`, 'utf8').trim();
}
