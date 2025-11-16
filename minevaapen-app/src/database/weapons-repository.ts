import type { SQLiteBindParams } from 'expo-sqlite';

import { runSql, runWithinTransaction } from './sqlite-helpers';

export type WeaponRecord = {
  id: string;
  displayName: string;
  type: string;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  acquisitionDate: string | null;
  acquisitionPrice: number | null;
  weaponCardRef: string | null;
  notes: string | null;
};

export type WeaponProgramLink = {
  programId: string;
  programName: string;
  organizationId: string;
  isReserve: boolean;
  status: 'approved' | 'pending' | 'proposed';
};

export type WeaponWithPrograms = WeaponRecord & {
  programs: WeaponProgramLink[];
};

export type WeaponFilters = {
  organizationId?: string | null;
  programId?: string | null;
  reserveFilter?: 'any' | 'reserveOnly' | 'nonReserve';
};

export type ProgramUsage = {
  id: string;
  name: string;
  organizationId: string;
  weaponCategory: string | null;
  isReserveAllowed: number;
  weaponCount: number;
  reserveCount: number;
};

type WeaponQueryRow = WeaponRecord & {
  programsJson: string;
};

type WeaponProgramJson = {
  programId: string;
  programName: string;
  organizationId: string;
  isReserve: number;
  status: 'approved' | 'pending' | 'proposed';
} | null;

type ProgramUsageRow = {
  id: string;
  name: string;
  organizationId: string;
  weaponCategory: string | null;
  isReserveAllowed: number;
  weaponCount: number | null;
  reserveCount: number | null;
};

export const fetchWeapons = async (
  filters: WeaponFilters = {}
): Promise<WeaponWithPrograms[]> => {
  const { sql, params } = buildWeaponQuery(filters);
  const result = await runSql<WeaponQueryRow>(sql, params);

  return result.rows.map((row) => ({
    ...row,
    programs: parsePrograms(row.programsJson),
  }));
};

export const fetchWeaponById = async (weaponId: string): Promise<WeaponWithPrograms | null> => {
  const sql = `
    SELECT
      w.id,
      w.displayName,
      w.type,
      w.manufacturer,
      w.model,
      w.serialNumber,
      w.acquisitionDate,
      w.acquisitionPrice,
      w.weaponCardRef,
      w.notes,
      IFNULL(json_group_array(
        CASE
          WHEN p.id IS NOT NULL THEN json_object(
            'programId', p.id,
            'programName', p.name,
            'organizationId', p.organizationId,
            'isReserve', wp.isReserve,
            'status', wp.status
          )
        END
      ), '[]') AS programsJson
    FROM weapons w
    LEFT JOIN weapon_programs wp ON wp.weaponId = w.id
    LEFT JOIN programs p ON p.id = wp.programId
    WHERE w.id = ?
    GROUP BY w.id
  `;

  const result = await runSql<WeaponQueryRow>(sql, [weaponId]);
  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return {
    ...row,
    programs: parsePrograms(row.programsJson),
  };
};

const buildWeaponQuery = (filters: WeaponFilters) => {
  const conditions: string[] = [];
  const params: SQLiteBindParams = [];

  if (filters.organizationId) {
    conditions.push(
      `EXISTS (
        SELECT 1
        FROM weapon_programs wpf
        INNER JOIN programs pf ON pf.id = wpf.programId
        WHERE wpf.weaponId = w.id AND pf.organizationId = ?
      )`
    );
    params.push(filters.organizationId);
  }

  if (filters.programId) {
    conditions.push(
      `EXISTS (
        SELECT 1
        FROM weapon_programs wpp
        WHERE wpp.weaponId = w.id AND wpp.programId = ?
      )`
    );
    params.push(filters.programId);
  }

  if (filters.reserveFilter === 'reserveOnly') {
    conditions.push(
      `EXISTS (
        SELECT 1 FROM weapon_programs wpr WHERE wpr.weaponId = w.id AND wpr.isReserve = 1
      )`
    );
  }

  if (filters.reserveFilter === 'nonReserve') {
    conditions.push(
      `NOT EXISTS (
        SELECT 1 FROM weapon_programs wpn WHERE wpn.weaponId = w.id AND wpn.isReserve = 1
      )`
    );
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const sql = `
    SELECT
      w.id,
      w.displayName,
      w.type,
      w.manufacturer,
      w.model,
      w.serialNumber,
      w.acquisitionDate,
      w.acquisitionPrice,
      w.weaponCardRef,
      w.notes,
      IFNULL(json_group_array(
        CASE
          WHEN p.id IS NOT NULL THEN json_object(
            'programId', p.id,
            'programName', p.name,
            'organizationId', p.organizationId,
            'isReserve', wp.isReserve,
            'status', wp.status
          )
        END
      ), '[]') AS programsJson
    FROM weapons w
    LEFT JOIN weapon_programs wp ON wp.weaponId = w.id
    LEFT JOIN programs p ON p.id = wp.programId
    ${whereClause}
    GROUP BY w.id
    ORDER BY w.displayName COLLATE NOCASE;
  `;

  return { sql, params };
};

export const fetchProgramUsage = async (
  organizationId?: string | null
): Promise<ProgramUsage[]> => {
  const params: SQLiteBindParams = [];
  const whereClause = organizationId ? 'WHERE p.organizationId = ?' : '';

  if (organizationId) {
    params.push(organizationId);
  }

  const sql = `
    SELECT
      p.id,
      p.name,
      p.organizationId,
      p.weaponCategory,
      p.isReserveAllowed,
      SUM(CASE WHEN wp.status = 'approved' THEN 1 ELSE 0 END) AS weaponCount,
      SUM(CASE WHEN wp.status = 'approved' AND wp.isReserve = 1 THEN 1 ELSE 0 END) AS reserveCount
    FROM programs p
    LEFT JOIN weapon_programs wp ON wp.programId = p.id
    ${whereClause}
    GROUP BY p.id
    ORDER BY p.name COLLATE NOCASE;
  `;

  const result = await runSql<ProgramUsageRow>(sql, params);

  return result.rows.map((row) => ({
    ...row,
    weaponCount: Number(row.weaponCount ?? 0),
    reserveCount: Number(row.reserveCount ?? 0),
  }));
};

export type UpsertWeaponInput = {
  id: string;
  displayName: string;
  type: string;
  manufacturer?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  acquisitionDate?: string | null;
  acquisitionPrice?: number | null;
  weaponCardRef?: string | null;
  notes?: string | null;
  programs: Array<{
    programId: string;
    status?: 'approved' | 'pending' | 'proposed';
    isReserve?: boolean;
  }>;
};

export const upsertWeapon = async (input: UpsertWeaponInput): Promise<void> => {
  await runWithinTransaction(async (db) => {
    await db.runAsync(
      `INSERT INTO weapons (
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
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        displayName = excluded.displayName,
        type = excluded.type,
        manufacturer = excluded.manufacturer,
        model = excluded.model,
        serialNumber = excluded.serialNumber,
        acquisitionDate = excluded.acquisitionDate,
        acquisitionPrice = excluded.acquisitionPrice,
        weaponCardRef = excluded.weaponCardRef,
        notes = excluded.notes
      `,
      [
        input.id,
        input.displayName,
        input.type,
        input.manufacturer ?? null,
        input.model ?? null,
        input.serialNumber ?? null,
        input.acquisitionDate ?? null,
        input.acquisitionPrice ?? null,
        input.weaponCardRef ?? null,
        input.notes ?? null,
      ]
    );

    await db.runAsync('DELETE FROM weapon_programs WHERE weaponId = ?', [input.id]);

    for (const program of input.programs) {
      await db.runAsync(
        `INSERT INTO weapon_programs (
          weaponId,
          programId,
          status,
          isReserve
        ) VALUES (?, ?, ?, ?)
        ON CONFLICT(weaponId, programId) DO UPDATE SET
          status = excluded.status,
          isReserve = excluded.isReserve
        `,
        [
          input.id,
          program.programId,
          program.status ?? 'approved',
          program.isReserve ? 1 : 0,
        ]
      );
    }
  });
};

export const deleteWeapon = async (weaponId: string): Promise<void> => {
  await runWithinTransaction(async (db) => {
    await db.runAsync('DELETE FROM weapon_programs WHERE weaponId = ?', [weaponId]);
    await db.runAsync('DELETE FROM weapons WHERE id = ?', [weaponId]);
  });
};

const parsePrograms = (raw: string): WeaponProgramLink[] => {
  try {
    const parsed = JSON.parse(raw) as WeaponProgramJson[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item): item is Exclude<WeaponProgramJson, null> => item !== null)
      .map((item) => ({
        programId: item.programId,
        programName: item.programName,
        organizationId: item.organizationId,
        isReserve: Boolean(item.isReserve),
        status: item.status,
      }));
  } catch (error) {
    console.warn('Failed to parse programs JSON', error);
    return [];
  }
};
