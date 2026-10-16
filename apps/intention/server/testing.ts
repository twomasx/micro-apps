import { getPlatformProxy } from 'wrangler';
import init from '../migrations/0001_init.sql?raw';
import paymentsMode from '../migrations/0002_payments_mode.sql?raw';

// Add each new migration here, in order.
const MIGRATIONS = [init, paymentsMode];

export interface TestDb {
  db: D1Database;
  dispose: () => Promise<void>;
}

/** A fresh in-memory D1 database with every migration applied. */
export async function createTestDb(): Promise<TestDb> {
  const proxy = await getPlatformProxy<Env>({ configPath: 'wrangler.jsonc', persist: false });
  const db = proxy.env.DB;
  for (const migration of MIGRATIONS) {
    const statements = migration
      .split('\n')
      .filter((line) => !line.trimStart().startsWith('--'))
      .join('\n')
      .split(';')
      .map((statement) => statement.trim())
      .filter((statement) => statement.length > 0);
    await db.batch(statements.map((statement) => db.prepare(statement)));
  }
  return { db, dispose: () => proxy.dispose() };
}
