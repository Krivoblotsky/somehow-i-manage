import Dexie, { type EntityTable, type Table } from 'dexie';
import type { Item, Person } from '../model/types';
import { changeLogMiddleware, type OutboxEntry } from '../sync/changeLog';

/** Small key/value facts the sync engine keeps per device: cursor, user, last sync time. */
export interface SyncMetaEntry {
  key: 'cursor' | 'userId' | 'lastSyncedAt';
  value: number | string;
}

/**
 * Local-first storage (IndexedDB). The UI only ever reads from here; sync (src/sync) copies
 * changes to and from the cloud. Keep every read and write of user data going through
 * src/data/repository.ts.
 */
export class PersonalDB extends Dexie {
  declare people: EntityTable<Person, 'id'>;
  declare items: EntityTable<Item, 'id'>;
  /** Pending uploads, one per record, written by the change-log middleware. */
  declare outbox: Table<OutboxEntry, [string, string]>;
  declare syncMeta: Table<SyncMetaEntry, SyncMetaEntry['key']>;

  // The database keeps its original name so data from before the rename survives.
  constructor(name = 'personal') {
    super(name);
    this.version(1).stores({
      // Booleans cannot be IndexedDB keys, so isCompleted is filtered in memory.
      people: 'id, sortOrder, updatedAt',
      items: 'id, personId, updatedAt, sortOrder',
    });
    this.version(2).stores({
      people: 'id, sortOrder, updatedAt',
      items: 'id, personId, updatedAt, sortOrder',
      outbox: '[table+id], queuedAt',
      syncMeta: 'key',
    });
    this.use(changeLogMiddleware);
  }
}

export const db = new PersonalDB();
