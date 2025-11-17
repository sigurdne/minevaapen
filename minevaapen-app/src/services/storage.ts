import * as FileSystem from 'expo-file-system';

import { fetchWeapons } from '@/src/database/weapons-repository';

const DOCUMENT_DIRECTORY = FileSystem.Paths.document.uri;
const SQLITE_DIRECTORY = FileSystem.Paths.join(DOCUMENT_DIRECTORY, 'SQLite');
const BACKUP_DIRECTORY = FileSystem.Paths.join(DOCUMENT_DIRECTORY, 'backups');
const EXPORT_DIRECTORY = FileSystem.Paths.join(DOCUMENT_DIRECTORY, 'exports');
const DATABASE_NAME = 'minevaapen.db';

const DB_PATH = FileSystem.Paths.join(SQLITE_DIRECTORY, DATABASE_NAME);

const ensureDirectory = async (path: string) => {
  const info = FileSystem.Paths.info(path);
  if (!info.exists) {
    const directory = new FileSystem.Directory(path);
    directory.create({ intermediates: true, idempotent: true });
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

  const databaseFile = new FileSystem.File(DB_PATH);
  const databaseInfo = databaseFile.info();
  if (!databaseInfo.exists) {
    throw new Error('Database not found');
  }

  const backupFile = new FileSystem.File(targetPath);
  databaseFile.copy(backupFile);

  return targetPath;
};

export type BackupFile = {
  name: string;
  path: string;
  modifiedAt: number;
};

const toBackupFile = (file: FileSystem.File): BackupFile | null => {
  const info = file.info();

  if (!info.exists) {
    return null;
  }

  return {
    name: file.name,
    path: file.uri,
    modifiedAt: typeof info.modificationTime === 'number' ? info.modificationTime : 0,
  };
};

export const listBackupFiles = async (): Promise<BackupFile[]> => {
  await ensureDirectory(BACKUP_DIRECTORY);
  const directory = new FileSystem.Directory(BACKUP_DIRECTORY);
  const entries = directory.list();
  const files = entries.filter((entry): entry is FileSystem.File => entry instanceof FileSystem.File);

  const backups = files.map(toBackupFile);

  return backups
    .filter((file): file is BackupFile => file !== null)
    .sort((a, b) => b.modifiedAt - a.modifiedAt);
};

type RestoreDatabaseOptions = {
  sourcePath?: string;
};

export const restoreDatabase = async (
  options: RestoreDatabaseOptions = {}
): Promise<BackupFile> => {
  const backups = await listBackupFiles();

  if (backups.length === 0) {
    throw new Error('No backups found');
  }

  let selectedBackup: BackupFile | undefined;

  if (options.sourcePath) {
    selectedBackup = backups.find((backup) => backup.path === options.sourcePath);
    if (!selectedBackup) {
      throw new Error('Selected backup not found');
    }
  } else {
    selectedBackup = backups[0];
  }

  await ensureDirectory(SQLITE_DIRECTORY);
  const databaseFile = new FileSystem.File(DB_PATH);
  if (FileSystem.Paths.info(DB_PATH).exists) {
    databaseFile.delete();
  }

  const selectedFile = new FileSystem.File(selectedBackup.path);
  selectedFile.copy(databaseFile);

  return selectedBackup;
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
    'operationMode',
    'caliber',
    'notes',
    'programs',
    'reserve',
  ];

  const rows = weapons.map((weapon) => {
    const approvedPrograms = weapon.programs.filter((program) => program.status === 'approved');
    const programString = approvedPrograms.map((program) => program.programName).join('; ');
    const reserveMark = approvedPrograms.some((program) => program.isReserve) ? 'X' : '';

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
      weapon.operationMode,
      weapon.caliber,
      weapon.notes,
      programString,
      reserveMark,
    ]
      .map(toCsvValue)
      .join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  const filePath = `${EXPORT_DIRECTORY}/minevaapen-weapons-${timestamp()}.csv`;
  const file = new FileSystem.File(filePath);
  file.write(csvContent, { encoding: 'utf8' });

  return filePath;
};
