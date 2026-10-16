import { getPlatformProxy } from 'wrangler';

export interface TestDb {
  db: D1Database;
  dispose: () => Promise<void>;
}

/** Runs a migration file: drops comment lines, splits on semicolons. */
export async function applySql(db: D1Database, sql: string): Promise<void> {
  const statements = sql
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('--'))
    .join('\n')
    .split(';')
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
  await db.batch(statements.map((statement) => db.prepare(statement)));
}

/** A fresh in-memory D1 database with the given schema files applied in order. */
export async function createTestDb(...schemas: string[]): Promise<TestDb> {
  const proxy = await getPlatformProxy<{ DB: D1Database }>({ configPath: 'test/wrangler.jsonc', persist: false });
  const db = proxy.env.DB;
  for (const schema of schemas) await applySql(db, schema);
  return { db, dispose: () => proxy.dispose() };
}
