import type { SQLTransaction } from 'expo-sqlite';

import { programSeeds } from '@/src/data/programs';
import { organizationSeeds } from '@/src/data/organizations';
import { createOrganizationsTable, createProgramsTable } from './schema';
import { runSql, runWithinTransaction } from './sqlite-helpers';

let seedPromise: Promise<void> | null = null;

export const ensureSeeded = (): Promise<void> => {
  if (!seedPromise) {
    seedPromise = seedDatabase();
  }

  return seedPromise;
};

const seedDatabase = async (): Promise<void> => {
  await runWithinTransaction((tx) => {
    tx.executeSql(createOrganizationsTable);
    tx.executeSql(createProgramsTable);
  });

  const result = await runSql('SELECT COUNT(*) as count FROM organizations');
  const count = result.rows.item(0)?.count as number;

  if (count > 0) {
    return;
  }

  await runWithinTransaction((tx) => {
    organizationSeeds.forEach((org) => insertOrganization(tx, org));
    programSeeds.forEach((program) => insertProgram(tx, program));
  });
};

const insertOrganization = (
  tx: SQLTransaction,
  org: (typeof organizationSeeds)[number]
) => {
  tx.executeSql(
    `INSERT INTO organizations (id, name, shortName, country, orgNumber) VALUES (?, ?, ?, ?, ?)` ,
    [org.id, org.name, org.shortName, org.country, org.orgNumber]
  );
};

const insertProgram = (
  tx: SQLTransaction,
  program: (typeof programSeeds)[number]
) => {
  tx.executeSql(
    `INSERT INTO programs (id, organizationId, name, weaponCategory, isReserveAllowed) VALUES (?, ?, ?, ?, ?)` ,
    [
      program.id,
      program.organizationId,
      program.name,
      program.weaponCategory,
      program.isReserveAllowed ? 1 : 0,
    ]
  );
};
