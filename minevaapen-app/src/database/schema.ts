export const createOrganizationsTable = `
  CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    shortName TEXT NOT NULL,
    country TEXT,
    orgNumber TEXT
  );
`;

export const createProgramsTable = `
  CREATE TABLE IF NOT EXISTS programs (
    id TEXT PRIMARY KEY NOT NULL,
    organizationId TEXT NOT NULL,
    name TEXT NOT NULL,
    weaponCategory TEXT,
    isReserveAllowed INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (organizationId) REFERENCES organizations(id)
  );
`;

export const createWeaponsTable = `
  CREATE TABLE IF NOT EXISTS weapons (
    id TEXT PRIMARY KEY NOT NULL,
    displayName TEXT NOT NULL,
    type TEXT NOT NULL,
    manufacturer TEXT,
    model TEXT,
    serialNumber TEXT,
    acquisitionDate TEXT,
    acquisitionPrice REAL,
    weaponCardRef TEXT,
    notes TEXT,
    operationMode TEXT,
    caliber TEXT
  );
`;

export const createWeaponProgramsTable = `
  CREATE TABLE IF NOT EXISTS weapon_programs (
    weaponId TEXT NOT NULL,
    programId TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'approved',
    isReserve INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (weaponId, programId),
    FOREIGN KEY (weaponId) REFERENCES weapons(id) ON DELETE CASCADE,
    FOREIGN KEY (programId) REFERENCES programs(id) ON DELETE CASCADE
  );
`;
