import * as FileSystem from 'expo-file-system';

import { fetchWeapons } from '@/src/database/weapons-repository';

const DOCUMENT_DIRECTORY = FileSystem.Paths.document.uri;
const SQLITE_DIRECTORY = FileSystem.Paths.join(DOCUMENT_DIRECTORY, 'SQLite');
const BACKUP_DIRECTORY = FileSystem.Paths.join(DOCUMENT_DIRECTORY, 'backups');
const EXPORT_DIRECTORY = FileSystem.Paths.join(DOCUMENT_DIRECTORY, 'exports');
const DATABASE_NAME = 'minevaapen.db';

const DB_PATH = FileSystem.Paths.join(SQLITE_DIRECTORY, DATABASE_NAME);

const ensureDirectory = async (path: string) => {
  const info = await FileSystem.getInfoAsync(path);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(path, { intermediates: true });
  }
};

const timestamp = () => {
  const now = new Date();
  const pad = (value: number) => value.toString().padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
};

export const backupDatabase = async (): Promise<string> => {
  await ensureDirectory(BACKUP_DIRECTORY);
  const targetPath = `${BACKUP_DIRECTORY}/minevaapen-backup-${timestamp()}.db`;

  const databaseInfo = await FileSystem.getInfoAsync(DB_PATH);
  if (!databaseInfo.exists) {
    throw new Error('Database not found');
  }

  await FileSystem.copyAsync({
    from: DB_PATH,
    to: targetPath,
  });

  return targetPath;
};

type CsvValue = string | number | null | undefined;

const toCsvValue = (value: CsvValue): string => {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);
  if (stringValue.includes('"') || stringValue.includes(',') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
};

export const exportWeaponsToCsv = async (): Promise<string> => {
  await ensureDirectory(EXPORT_DIRECTORY);

  const weapons = await fetchWeapons();
  if (weapons.length === 0) {
    throw new Error('No weapons available to export');
  }
  const headers = [
    'id',
    'displayName',
    'type',
    'manufacturer',
    'model',
    'serialNumber',
    'acquisitionDate',
    'acquisitionPrice',
    'weaponCardRef',
    'notes',
    'programs',
  ];

  const rows = weapons.map((weapon) => {
    const programString = weapon.programs
      .map((program) => `${program.programName}${program.isReserve ? ' (reserve)' : ''}`)
      .join('; ');

    return [
      weapon.id,
      weapon.displayName,
      weapon.type,
      weapon.manufacturer,
      weapon.model,
      weapon.serialNumber,
      weapon.acquisitionDate,
      weapon.acquisitionPrice,
      weapon.weaponCardRef,
      weapon.notes,
      programString,
    ]
      .map(toCsvValue)
      .join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  const filePath = `${EXPORT_DIRECTORY}/minevaapen-weapons-${timestamp()}.csv`;

  await FileSystem.writeAsStringAsync(filePath, csvContent, { encoding: 'utf8' });

  return filePath;
};
