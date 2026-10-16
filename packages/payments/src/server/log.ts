/**
 * The payment_log table: every checkout start, webhook, verify, unlock, refund and failure, with the app,
 * product, session id and result. No card data and no email ever reaches our servers, so none is logged.
 */
export type LogAction =
  | 'checkout'
  | 'webhook'
  | 'verify'
  | 'unlock'
  | 'refund'
  | 'dispute'
  | 'code_check'
  | 'pass_check'
  | 'reissue'
  | 'error';

export interface LogEntry {
  action: LogAction;
  result: string;
  product?: string | null;
  sessionId?: string | null;
  detail?: string | null;
}

export async function writeLog(db: D1Database, app: string, mode: string, entry: LogEntry): Promise<void> {
  await db
    .prepare(
      `INSERT INTO payment_log (at, app, mode, action, product, session_id, result, detail)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      new Date().toISOString(),
      app,
      mode,
      entry.action,
      entry.product ?? null,
      entry.sessionId ?? null,
      entry.result,
      entry.detail?.slice(0, 500) ?? null,
    )
    .run();
}
