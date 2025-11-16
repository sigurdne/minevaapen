import type { SQLResultSet, SQLTransaction, SQLStatementArg } from 'expo-sqlite';
import { getDatabase } from './db';

export const runSql = (
  sql: string,
  params: SQLStatementArg[] = [],
  mode: 'read' | 'write' = 'read'
): Promise<SQLResultSet> =>
  new Promise((resolve, reject) => {
    const db = getDatabase();
    const executor = mode === 'read' ? db.readTransaction : db.transaction;

    executor.call(
      db,
      (tx: SQLTransaction) => {
        tx.executeSql(
          sql,
          params,
          (_, result) => {
            resolve(result);
            return true;
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      },
      (error) => reject(error),
      () => {
        /* noop */
      }
    );
  });

export const runWithinTransaction = (
  callback: (tx: SQLTransaction) => void
): Promise<void> =>
  new Promise((resolve, reject) => {
    const db = getDatabase();
    db.transaction(
      (tx) => callback(tx),
      (error) => reject(error),
      () => resolve()
    );
  });
