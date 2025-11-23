import { runSql, runWithinTransaction } from '@/src/database/sqlite-helpers';

export type OrganizationRecord = {
  id: string;
  name: string;
  shortName: string;
  country: string | null;
  orgNumber: string | null;
  isMember: boolean;
};

type OrganizationRow = Omit<OrganizationRecord, 'isMember'> & { isMember: number };

export const fetchOrganizations = async (): Promise<OrganizationRecord[]> => {
  const result = await runSql<OrganizationRow>(
    `SELECT id, name, shortName, country, orgNumber, isMember
     FROM organizations
     ORDER BY name COLLATE NOCASE`
  );

  return result.rows.map(({ isMember, ...rest }) => ({
    ...rest,
    isMember: Boolean(isMember),
  }));
};

export const setOrganizationMembership = async (
  organizationId: string,
  isMember: boolean
): Promise<void> => {
  await runWithinTransaction(async (db) => {
    await db.runAsync('UPDATE organizations SET isMember = ? WHERE id = ?', [
      isMember ? 1 : 0,
      organizationId,
    ]);
  });
};

export const setAllOrganizationMemberships = async (isMember: boolean): Promise<void> => {
  await runWithinTransaction(async (db) => {
    await db.runAsync('UPDATE organizations SET isMember = ?', [isMember ? 1 : 0]);
  });
};
