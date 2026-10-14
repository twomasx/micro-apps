import { normalizeCode } from './unlock-code';

/** The unlock as remembered on this device. */
export interface SavedUnlock {
  /** The code as shown to the buyer, like 7K3M-Q9TD-2XWB-HC4R. */
  code: string;
  /** The server's last answer for this code. */
  valid: boolean;
  /** When the server last answered, in ms since 1970. */
  checkedAt: number;
}

/** Turns whatever was in storage into a saved unlock, or null. */
export function sanitizeUnlock(raw: unknown): SavedUnlock | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const saved = raw as Record<string, unknown>;
  if (typeof saved.code !== 'string' || normalizeCode(saved.code) === null) return null;
  return {
    code: saved.code,
    valid: saved.valid === true,
    checkedAt: typeof saved.checkedAt === 'number' ? saved.checkedAt : 0,
  };
}

export interface RefreshDeps {
  load: () => Promise<SavedUnlock | null>;
  save: (unlock: SavedUnlock) => Promise<void>;
  check: (code: string) => Promise<boolean>;
  online: () => boolean;
  now: () => number;
  /** Called with the answer to use now, then again if the server changes it. */
  apply: (unlocked: boolean) => void;
}

/**
 * On each visit: use the last answer at once, so an offline visit stays unlocked,
 * then ask the server when online. A network failure keeps the last answer.
 */
export async function refreshUnlock(deps: RefreshDeps): Promise<void> {
  const saved = await deps.load();
  if (!saved) return;
  deps.apply(saved.valid);
  if (!deps.online()) return;

  let valid: boolean;
  try {
    valid = await deps.check(saved.code);
  } catch {
    return;
  }
  await deps.save({ ...saved, valid, checkedAt: deps.now() });
  if (valid !== saved.valid) deps.apply(valid);
}

export type PurchaseState =
  | { kind: 'checking' }
  | { kind: 'paid'; code: string }
  /** Stripe has not confirmed the payment yet. It can take a little while. */
  | { kind: 'pending' }
  | { kind: 'notFound' }
  | { kind: 'offline' };

export interface ConfirmDeps {
  fetchPurchase: (sessionId: string) => Promise<{ paid: true; code: string } | { paid: false }>;
  wait: (ms: number) => Promise<void>;
  /** True when the page has gone away and the polling should stop. */
  cancelled: () => boolean;
}

export const CONFIRM_ATTEMPTS = 8;
export const CONFIRM_DELAY_MS = 1_500;

/** Asks the server about a returning buyer's payment a few times before giving up for now. */
export async function confirmPurchase(sessionId: string, deps: ConfirmDeps): Promise<PurchaseState> {
  for (let attempt = 0; attempt < CONFIRM_ATTEMPTS; attempt++) {
    if (attempt > 0) await deps.wait(CONFIRM_DELAY_MS);
    if (deps.cancelled()) return { kind: 'checking' };
    try {
      const answer = await deps.fetchPurchase(sessionId);
      if (answer.paid) return { kind: 'paid', code: answer.code };
    } catch (error) {
      const status = (error as { status?: unknown }).status;
      return status === 404 ? { kind: 'notFound' } : { kind: 'offline' };
    }
  }
  return { kind: 'pending' };
}
