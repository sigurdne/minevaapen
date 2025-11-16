import { programSeeds } from '@/src/data/programs';
import { organizationSeeds } from '@/src/data/organizations';
import { createOrganizationsTable, createProgramsTable } from './schema';
import { runSql, runWithinTransaction } from './sqlite-helpers';
import type { SQLiteDatabase } from 'expo-sqlite';

let seedPromise: Promise<void> | null = null;

export const ensureSeeded = (): Promise<void> => {
  if (!seedPromise) {
    seedPromise = seedDatabase();
  }

  return seedPromise;
};

const seedDatabase = async (): Promise<void> => {
  await runWithinTransaction(async (db) => {
    await db.execAsync(createOrganizationsTable);
    await db.execAsync(createProgramsTable);
  });

  const result = await runSql<{ count: number }>(
    'SELECT COUNT(*) as count FROM organizations'
  );
  const count = result.rows[0]?.count ?? 0;

  if (count > 0) {
    return;
  }

  await runWithinTransaction(async (db) => {
    for (const org of organizationSeeds) {
      await insertOrganization(db, org);
    }

    for (const program of programSeeds) {
      await insertProgram(db, program);
    }
  });
};

const insertOrganization = async (
  db: SQLiteDatabase,
  org: (typeof organizationSeeds)[number]
): Promise<void> => {
  await db.runAsync(
    'INSERT INTO organizations (id, name, shortName, country, orgNumber) VALUES (?, ?, ?, ?, ?)',
    [org.id, org.name, org.shortName, org.country, org.orgNumber]
  );
};

const insertProgram = async (
  db: SQLiteDatabase,
  program: (typeof programSeeds)[number]
): Promise<void> => {
  await db.runAsync(
    'INSERT INTO programs (id, organizationId, name, weaponCategory, isReserveAllowed) VALUES (?, ?, ?, ?, ?)',
    [
      program.id,
      program.organizationId,
      program.name,
      program.weaponCategory,
      program.isReserveAllowed ? 1 : 0,
    ]
  );
};
