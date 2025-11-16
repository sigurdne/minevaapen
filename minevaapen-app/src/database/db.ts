import { openDatabase, type SQLiteDatabase } from 'expo-sqlite';

let dbInstance: SQLiteDatabase | null = null;

export const getDatabase = (): SQLiteDatabase => {
  if (!dbInstance) {
    dbInstance = openDatabase('minevaapen.db');
  }

  return dbInstance;
};
