import { pickColor } from '../model/palette';
import type { Item, ItemKind, MapPosition, Person } from '../model/types';
import { db as defaultDb, type PersonalDB } from './db';
import { parseBulkText } from './import';

const now = () => Date.now();
const newId = () => crypto.randomUUID();

export interface NewPerson {
  name: string;
  role?: string;
  colorIndex?: number;
  avatarDataUrl?: string;
}

export async function createPerson(
  input: NewPerson,
  database: PersonalDB = defaultDb,
): Promise<Person> {
  return database.transaction('rw', database.people, async () => {
    const existing = await database.people.toArray();
    const maxOrder = existing.reduce((m, p) => Math.max(m, p.sortOrder), -1);
    const t = now();
    const person: Person = {
      id: newId(),
      name: input.name.trim(),
      role: input.role?.trim() || undefined,
      colorIndex: input.colorIndex ?? pickColor(existing.map((p) => p.colorIndex)),
      avatarDataUrl: input.avatarDataUrl,
      sortOrder: maxOrder + 1,
      createdAt: t,
      updatedAt: t,
    };
    await database.people.add(person);
    return person;
  });
}

export type PersonPatch = Partial<Omit<Person, 'id' | 'createdAt' | 'updatedAt'>>;

export async function updatePerson(
  id: string,
  patch: PersonPatch,
  database: PersonalDB = defaultDb,
): Promise<void> {
  await database.people.update(id, { ...patch, updatedAt: now() });
}

/** Deletes the person and every item that belongs to them. */
export async function deletePerson(id: string, database: PersonalDB = defaultDb): Promise<void> {
  await database.transaction('rw', database.people, database.items, async () => {
    await database.items.where('personId').equals(id).delete();
    await database.people.delete(id);
  });
}

export async function reorderPeople(
  orderedIds: string[],
  database: PersonalDB = defaultDb,
): Promise<void> {
  await database.transaction('rw', database.people, async () => {
    await Promise.all(orderedIds.map((id, i) => database.people.update(id, { sortOrder: i })));
  });
}

export interface NewItem {
  personId: string;
  kind?: ItemKind;
  title?: string;
  body?: string;
  isCompleted?: boolean;
  isFlagged?: boolean;
}

export async function createItem(input: NewItem, database: PersonalDB = defaultDb): Promise<Item> {
  return database.transaction('rw', database.items, async () => {
    const siblings = await database.items.where('personId').equals(input.personId).toArray();
    const maxOrder = siblings.reduce((m, i) => Math.max(m, i.sortOrder), -1);
    const t = now();
    const isCompleted = input.kind !== 'note' && (input.isCompleted ?? false);
    const item: Item = {
      id: newId(),
      personId: input.personId,
      kind: input.kind ?? 'task',
      title: (input.title ?? '').trim(),
      body: input.body ?? '',
      isCompleted,
      completedAt: isCompleted ? t : undefined,
      isFlagged: input.isFlagged ?? false,
      sortOrder: maxOrder + 1,
      createdAt: t,
      updatedAt: t,
    };
    await database.items.add(item);
    return item;
  });
}

export type ItemPatch = Partial<Omit<Item, 'id' | 'personId' | 'createdAt' | 'updatedAt'>>;

export async function updateItem(
  id: string,
  patch: ItemPatch,
  database: PersonalDB = defaultDb,
): Promise<void> {
  await database.items.update(id, { ...patch, updatedAt: now() });
}

export async function setItemCompleted(
  id: string,
  isCompleted: boolean,
  database: PersonalDB = defaultDb,
): Promise<void> {
  const t = now();
  await database.items.update(id, {
    isCompleted,
    completedAt: isCompleted ? t : undefined,
    updatedAt: t,
  });
}

export async function toggleItemCompleted(
  id: string,
  database: PersonalDB = defaultDb,
): Promise<void> {
  const item = await database.items.get(id);
  if (!item) return;
  await setItemCompleted(id, !item.isCompleted, database);
}

/** Switching a task to a note drops completion; a note never shows a checkbox. */
export async function setItemKind(
  id: string,
  kind: ItemKind,
  database: PersonalDB = defaultDb,
): Promise<void> {
  const patch: ItemPatch = { kind };
  if (kind === 'note') {
    patch.isCompleted = false;
    patch.completedAt = undefined;
  }
  await updateItem(id, patch, database);
}

export async function deleteItem(id: string, database: PersonalDB = defaultDb): Promise<void> {
  await database.items.delete(id);
}

export async function moveItem(
  id: string,
  toPersonId: string,
  database: PersonalDB = defaultDb,
): Promise<void> {
  await database.transaction('rw', database.items, async () => {
    const siblings = await database.items.where('personId').equals(toPersonId).toArray();
    const maxOrder = siblings.reduce((m, i) => Math.max(m, i.sortOrder), -1);
    await database.items.update(id, {
      personId: toPersonId,
      sortOrder: maxOrder + 1,
      mapPosition: undefined, // a position relative to the old owner means nothing now
      updatedAt: now(),
    });
  });
}

/** One item per line; see parseBulkText for the markers. */
export async function bulkAddItems(
  personId: string,
  text: string,
  database: PersonalDB = defaultDb,
): Promise<Item[]> {
  const parsed = parseBulkText(text);
  const created: Item[] = [];
  await database.transaction('rw', database.items, async () => {
    for (const line of parsed) {
      created.push(await createItem({ personId, ...line }, database));
    }
  });
  return created;
}

/** Layout only — does not touch updatedAt, so dragging a card never changes its shown date. */
export async function setPersonMapPosition(
  id: string,
  position: MapPosition | undefined,
  database: PersonalDB = defaultDb,
): Promise<void> {
  await database.people.update(id, { mapPosition: position });
}

export async function setItemMapPosition(
  id: string,
  position: MapPosition | undefined,
  database: PersonalDB = defaultDb,
): Promise<void> {
  await database.items.update(id, { mapPosition: position });
}

/** Forget every manual position; the map falls back to the automatic layout. */
export async function resetMapLayout(database: PersonalDB = defaultDb): Promise<void> {
  await database.transaction('rw', database.people, database.items, async () => {
    await database.people.toCollection().modify((p) => {
      delete p.mapPosition;
    });
    await database.items.toCollection().modify((i) => {
      delete i.mapPosition;
    });
  });
}

export async function clearAllData(database: PersonalDB = defaultDb): Promise<void> {
  await database.transaction('rw', database.people, database.items, async () => {
    await database.items.clear();
    await database.people.clear();
  });
}
