import { programSeeds } from '@/src/data/programs';
import { organizationSeeds } from '@/src/data/organizations';
import { weaponSeeds } from '@/src/data/weapons';
import { weaponProgramSeeds } from '@/src/data/weapon-programs';
import {
  createOrganizationsTable,
  createProgramsTable,
  createWeaponProgramsTable,
  createWeaponsTable,
} from './schema';
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
    await db.execAsync(createWeaponsTable);
    await db.execAsync(createWeaponProgramsTable);
  });

  await seedOrganizationsIfEmpty();
  await seedProgramsIfEmpty();
  await seedWeaponsIfEmpty();
  await seedWeaponProgramsIfEmpty();
};

const seedOrganizationsIfEmpty = async (): Promise<void> => {
  if (await tableHasRows('organizations')) {
    return;
  }

  await runWithinTransaction(async (db) => {
    for (const org of organizationSeeds) {
      await insertOrganization(db, org);
    }
  });
};

const seedProgramsIfEmpty = async (): Promise<void> => {
  if (await tableHasRows('programs')) {
    return;
  }

  await runWithinTransaction(async (db) => {
    for (const program of programSeeds) {
      await insertProgram(db, program);
    }
  });
};

const seedWeaponsIfEmpty = async (): Promise<void> => {
  if (await tableHasRows('weapons')) {
    return;
  }

  await runWithinTransaction(async (db) => {
    for (const weapon of weaponSeeds) {
      await insertWeapon(db, weapon);
    }
  });
};

const seedWeaponProgramsIfEmpty = async (): Promise<void> => {
  if (await tableHasRows('weapon_programs')) {
    return;
  }

  await runWithinTransaction(async (db) => {
    for (const relation of weaponProgramSeeds) {
      await insertWeaponProgram(db, relation);
    }
  });
};

const insertOrganization = async (
  db: SQLiteDatabase,
  org: (typeof organizationSeeds)[number]
): Promise<void> => {
  await db.runAsync(
    'INSERT OR IGNORE INTO organizations (id, name, shortName, country, orgNumber) VALUES (?, ?, ?, ?, ?)',
    [org.id, org.name, org.shortName, org.country, org.orgNumber]
  );
};

const insertProgram = async (
  db: SQLiteDatabase,
  program: (typeof programSeeds)[number]
): Promise<void> => {
  await db.runAsync(
    'INSERT OR IGNORE INTO programs (id, organizationId, name, weaponCategory, isReserveAllowed) VALUES (?, ?, ?, ?, ?)',
    [
      program.id,
      program.organizationId,
      program.name,
      program.weaponCategory,
      program.isReserveAllowed ? 1 : 0,
    ]
  );
};

const insertWeapon = async (
  db: SQLiteDatabase,
  weapon: (typeof weaponSeeds)[number]
): Promise<void> => {
  await db.runAsync(
    `INSERT OR IGNORE INTO weapons (
      id,
      displayName,
      type,
      manufacturer,
      model,
      serialNumber,
      acquisitionDate,
      acquisitionPrice,
      weaponCardRef,
      notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      weapon.id,
      weapon.displayName,
      weapon.type,
      weapon.manufacturer ?? null,
      weapon.model ?? null,
      weapon.serialNumber ?? null,
      weapon.acquisitionDate ?? null,
      weapon.acquisitionPrice ?? null,
      weapon.weaponCardRef ?? null,
      weapon.notes ?? null,
    ]
  );
};

const insertWeaponProgram = async (
  db: SQLiteDatabase,
  relation: (typeof weaponProgramSeeds)[number]
): Promise<void> => {
  await db.runAsync(
    `INSERT OR IGNORE INTO weapon_programs (
      weaponId,
      programId,
      status,
      isReserve
    ) VALUES (?, ?, ?, ?)`,
    [
      relation.weaponId,
      relation.programId,
      relation.status,
      relation.isReserve ? 1 : 0,
    ]
  );
};

const tableHasRows = async (tableName: string): Promise<boolean> => {
  const result = await runSql<{ count: number }>(
    `SELECT COUNT(*) as count FROM ${tableName}`
  );

  return (result.rows[0]?.count ?? 0) > 0;
};
