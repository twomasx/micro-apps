import type { PaymentsMode } from '../settings';
import type { Product } from '../types';
import { formatCode, hashCode, normalizeCode, unlockCodeFor } from '../unlock-codes';
import { randomId } from './http';
import { writeLog, type LogEntry } from './log';

/**
 * pending: checkout started, not paid. paid: unlocks. refunded and disputed: unlocked once, revoked now.
 * Only `paid` unlocks anything.
 */
export type PurchaseStatus = 'pending' | 'paid' | 'refunded' | 'disputed';

export interface PurchaseRow {
  stripe_session_id: string;
  status: PurchaseStatus;
  mode: PaymentsMode;
  payment_intent_id: string | null;
  /** Only in apps whose buyers get an unlock code. */
  code_generation?: number;
  [column: string]: unknown;
}

export interface StoreOptions {
  db: D1Database;
  /** The app's name, written to the log. */
  app: string;
  /** PAYMENTS_MODE. Every query only sees purchases made in this mode. */
  mode: PaymentsMode;
  /** UNLOCK_CODE_SECRET, in apps whose buyers get an unlock code. Personality has none. */
  codeSecret?: string;
}

const COLUMN = /^[a-z_]+$/;

/**
 * The purchases table, the stripe_events table and the payment_log table of one app, in one mode.
 * Every app's migrations create the same columns; see packages/payments/test/schema.sql.
 */
export function purchaseStore(options: StoreOptions) {
  const { db, app, mode, codeSecret } = options;

  async function find(sessionId: string): Promise<PurchaseRow | null> {
    return db
      .prepare('SELECT * FROM purchases WHERE stripe_session_id = ? AND mode = ?')
      .bind(sessionId, mode)
      .first<PurchaseRow>();
  }

  async function codeHash(sessionId: string, generation: number): Promise<string> {
    if (!codeSecret) throw new Error('This app has no unlock codes');
    return hashCode(await unlockCodeFor(codeSecret, sessionId, generation));
  }

  return {
    mode,
    find,

    log(entry: LogEntry): Promise<void> {
      return writeLog(db, app, mode, entry);
    },

    /** The row starts as pending. Only the webhook or a session confirmed with Stripe turns it into paid. */
    async insertPending(sessionId: string, product: Product, extra: Record<string, string | number | null> = {}) {
      const columns = Object.keys(extra);
      if (!columns.every((column) => COLUMN.test(column))) throw new Error('Bad column name');
      const names = ['id', 'stripe_session_id', 'amount_cents', 'currency', 'status', 'mode', 'created_at', ...columns];
      await db
        .prepare(`INSERT INTO purchases (${names.join(', ')}) VALUES (${names.map(() => '?').join(', ')})`)
        .bind(
          randomId(),
          sessionId,
          product.amount,
          product.currency,
          'pending',
          mode,
          new Date().toISOString(),
          ...columns.map((column) => extra[column] ?? null),
        )
        .run();
    },

    /**
     * Records a paid checkout, with the hash of its unlock code where the app has codes.
     * Only a pending row changes, so a second call does nothing, and a refund or dispute
     * that arrived first is never undone.
     */
    async markPaid(sessionId: string, paymentIntentId: string | null): Promise<boolean> {
      const now = new Date().toISOString();
      const statement = codeSecret
        ? db
            .prepare(
              `UPDATE purchases SET status = 'paid', payment_intent_id = ?, unlock_code_hash = ?, updated_at = ?
               WHERE stripe_session_id = ? AND mode = ? AND status = 'pending'`,
            )
            .bind(paymentIntentId, await codeHash(sessionId, 0), now, sessionId, mode)
        : db
            .prepare(
              `UPDATE purchases SET status = 'paid', payment_intent_id = ?, updated_at = ?
               WHERE stripe_session_id = ? AND mode = ? AND status = 'pending'`,
            )
            .bind(paymentIntentId, now, sessionId, mode);
      const result = await statement.run();
      return result.meta.changes > 0;
    },

    /** Takes the unlock away after a full refund or a dispute. Works whether or not the payment was recorded yet. */
    async revoke(sessionId: string, status: 'refunded' | 'disputed'): Promise<boolean> {
      const result = await db
        .prepare(
          `UPDATE purchases SET status = ?, updated_at = ?
           WHERE stripe_session_id = ? AND mode = ? AND status IN ('pending', 'paid', 'refunded')`,
        )
        .bind(status, new Date().toISOString(), sessionId, mode)
        .run();
      return result.meta.changes > 0;
    },

    /** True when this Stripe event was already handled. */
    async seenEvent(eventId: string): Promise<boolean> {
      return (await db.prepare('SELECT 1 FROM stripe_events WHERE id = ?').bind(eventId).first()) !== null;
    },

    async recordEvent(eventId: string, type: string): Promise<void> {
      await db
        .prepare('INSERT OR IGNORE INTO stripe_events (id, type, received_at) VALUES (?, ?, ?)')
        .bind(eventId, type, new Date().toISOString())
        .run();
    },

    /** The current unlock code of a paid purchase, formatted for people. */
    async currentCode(row: PurchaseRow): Promise<string> {
      if (!codeSecret) throw new Error('This app has no unlock codes');
      return formatCode(await unlockCodeFor(codeSecret, row.stripe_session_id, row.code_generation ?? 0));
    },

    /** The paid purchase this code belongs to, or null. Looked up by hash; the code itself is never stored. */
    async findByCode(input: string): Promise<PurchaseRow | null> {
      const code = normalizeCode(input);
      if (!code) return null;
      return db
        .prepare(`SELECT * FROM purchases WHERE unlock_code_hash = ? AND mode = ? AND status = 'paid'`)
        .bind(await hashCode(code), mode)
        .first<PurchaseRow>();
    },
  };
}

export type PurchaseStore = ReturnType<typeof purchaseStore>;
