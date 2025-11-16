import type {
  SQLiteDatabase,
  SQLiteBindParams,
} from 'expo-sqlite';
import { getDatabase } from './db';

export type QueryResult<T = Record<string, unknown>> = {
  rows: T[];
  changes: number;
  lastInsertRowId: number;
};

export const runSql = async <T = Record<string, unknown>>(
  sql: string,
  params: SQLiteBindParams = []
): Promise<QueryResult<T>> => {
  const db = getDatabase();
  const statement = await db.prepareAsync(sql);

  try {
    const result = await statement.executeAsync<T>(params);
    const rows = await result.getAllAsync();

    return {
      rows,
      changes: result.changes,
      lastInsertRowId: result.lastInsertRowId,
    };
  } finally {
    await statement.finalizeAsync();
  }
};

export const runWithinTransaction = async (
  callback: (db: SQLiteDatabase) => Promise<void> | void
): Promise<void> => {
  const db = getDatabase();
  await db.withTransactionAsync(async () => {
    await callback(db);
  });
};
