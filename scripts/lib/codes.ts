import { formatPassCode, normalizePassCode, passCodeFor } from '@micro/payments/pass-codes';
import { formatCode, hashCode, normalizeCode, unlockCodeFor } from '@micro/payments/unlock-codes';
import type { Seller } from './catalog.ts';

/** An app's code, made again from its secret, the session and the generation. */
export async function codeFor(app: Seller, secret: string, sessionId: string, generation: number): Promise<string> {
  return app === 'pass' ? formatPassCode(await passCodeFor(secret, sessionId, generation)) : formatCode(await unlockCodeFor(secret, sessionId, generation));
}

/** The hash a typed code is stored under, or null when it is not a code of this kind. */
export async function hashOfTyped(app: Seller, typed: string): Promise<string | null> {
  const code = app === 'pass' ? normalizePassCode(typed) : normalizeCode(typed);
  return code ? hashCode(code) : null;
}

