import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';

let dbInstance: SQLiteDatabase | null = null;

export const getDatabase = (): SQLiteDatabase => {
  if (!dbInstance) {
    dbInstance = openDatabaseSync('minevaapen.db');
  }

  return dbInstance;
};

export const closeDatabase = async (): Promise<void> => {
  if (dbInstance) {
    await dbInstance.closeAsync();
    dbInstance = null;
  }
};
