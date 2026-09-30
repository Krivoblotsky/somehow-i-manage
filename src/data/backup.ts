import type { Item, Person } from '../model/types';
import { db as defaultDb, type PersonalDB } from './db';

export const BACKUP_APP = 'somehow-i-manage';
export const BACKUP_VERSION = 1;

export interface Backup {
  app: typeof BACKUP_APP;
  version: number;
  exportedAt: string;
  people: Person[];
  items: Item[];
}

export type RestoreMode = 'merge' | 'replace';

export type ParseResult =
  { ok: true; backup: Backup; skippedItems: number } | { ok: false; error: string };

/** Everything the app knows, as one JSON document. Avatars are included as data URLs. */
export async function createBackup(database: PersonalDB = defaultDb): Promise<Backup> {
  const [people, items] = await Promise.all([database.people.toArray(), database.items.toArray()]);
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    people,
    items,
  };
}

export function serializeBackup(backup: Backup): string {
  return JSON.stringify(backup, null, 2);
}

export function backupFilename(date = new Date()): string {
  return `${BACKUP_APP}-backup-${date.toISOString().slice(0, 10)}.json`;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const isString = (v: unknown): v is string => typeof v === 'string';
const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isBoolean = (v: unknown): v is boolean => typeof v === 'boolean';

function isPerson(v: unknown): v is Person {
  return (
    isRecord(v) &&
    isString(v.id) &&
    isString(v.name) &&
    isNumber(v.colorIndex) &&
    isNumber(v.sortOrder) &&
    isNumber(v.createdAt) &&
    isNumber(v.updatedAt)
  );
}

function isItem(v: unknown): v is Item {
  return (
    isRecord(v) &&
    isString(v.id) &&
    isString(v.personId) &&
    (v.kind === 'task' || v.kind === 'note') &&
    isString(v.title) &&
    isString(v.body) &&
    isBoolean(v.isCompleted) &&
    isBoolean(v.isFlagged) &&
    isNumber(v.sortOrder) &&
    isNumber(v.createdAt) &&
    isNumber(v.updatedAt)
  );
}

/** Validate a backup file's text. Items whose person is missing from the file are skipped. */
export function parseBackup(text: string): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'This is not a JSON file.' };
  }
  if (!isRecord(data) || data.app !== BACKUP_APP) {
    return { ok: false, error: 'This file was not made by Somehow I Manage.' };
  }
  if (!isNumber(data.version) || data.version > BACKUP_VERSION) {
    return { ok: false, error: 'This backup comes from a newer version of the app.' };
  }
  if (!Array.isArray(data.people) || !Array.isArray(data.items)) {
    return { ok: false, error: 'The backup is missing its people or items.' };
  }
  const people = data.people.filter(isPerson);
  if (people.length !== data.people.length) {
    return { ok: false, error: 'Some people in the backup are malformed.' };
  }
  const known = new Set(people.map((p) => p.id));
  const validItems = data.items.filter(isItem);
  if (validItems.length !== data.items.length) {
    return { ok: false, error: 'Some items in the backup are malformed.' };
  }
  const items = validItems.filter((i) => known.has(i.personId));
  return {
    ok: true,
    backup: {
      app: BACKUP_APP,
      version: data.version,
      exportedAt: isString(data.exportedAt) ? data.exportedAt : '',
      people,
      items,
    },
    skippedItems: validItems.length - items.length,
  };
}

/**
 * Put a backup into the database. `merge` adds or overwrites by id and keeps everything else;
 * `replace` deletes all current data first.
 */
export async function restoreBackup(
  backup: Backup,
  mode: RestoreMode,
  database: PersonalDB = defaultDb,
): Promise<{ people: number; items: number }> {
  await database.transaction('rw', database.people, database.items, async () => {
    if (mode === 'replace') {
      await database.items.clear();
      await database.people.clear();
    }
    await database.people.bulkPut(backup.people);
    await database.items.bulkPut(backup.items);
  });
  return { people: backup.people.length, items: backup.items.length };
}
