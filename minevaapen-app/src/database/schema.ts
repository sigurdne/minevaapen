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
