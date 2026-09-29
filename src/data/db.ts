import Dexie, { type EntityTable } from 'dexie';
import type { Item, Person } from '../model/types';

/**
 * Local-first storage (IndexedDB). Sync to a backend is a later milestone; keep
 * everything that reads or writes data going through src/data/repository.ts so
 * that swap stays small.
 */
export class PersonalDB extends Dexie {
  declare people: EntityTable<Person, 'id'>;
  declare items: EntityTable<Item, 'id'>;

  constructor(name = 'personal') {
    super(name);
    this.version(1).stores({
      // Booleans cannot be IndexedDB keys, so isCompleted is filtered in memory.
      people: 'id, sortOrder, updatedAt',
      items: 'id, personId, updatedAt, sortOrder',
    });
  }
}

export const db = new PersonalDB();
