import {
  itemRelativePosition,
  layoutClusters,
  placeItem,
  placePerson,
  ringLayout,
} from '../map/layout';
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
  mapPosition?: MapPosition;
}

const byOrder = <T extends { sortOrder: number }>(a: T, b: T) => a.sortOrder - b.sortOrder;

/** Every person's map position, falling back to the grid for any that were never placed. */
function personPositions(people: Person[], items: Item[]): Map<string, MapPosition> {
  const sorted = [...people].sort(byOrder);
  const grid = layoutClusters(sorted.map((p) => items.filter((i) => i.personId === p.id).length));
  return new Map(sorted.map((p, i) => [p.id, p.mapPosition ?? grid[i]]));
}

export async function createPerson(
  input: NewPerson,
  database: PersonalDB = defaultDb,
): Promise<Person> {
  return database.transaction('rw', database.people, database.items, async () => {
    const existing = await database.people.toArray();
    const items = await database.items.toArray();
    const positions = personPositions(existing, items);
    const maxOrder = existing.reduce((m, p) => Math.max(m, p.sortOrder), -1);
    const t = now();
    const person: Person = {
      id: newId(),
      name: input.name.trim(),
      role: input.role?.trim() || undefined,
      colorIndex: input.colorIndex ?? pickColor(existing.map((p) => p.colorIndex)),
      avatarDataUrl: input.avatarDataUrl,
      mapPosition:
        input.mapPosition ??
        placePerson(
          existing.map((p) => ({
            position: positions.get(p.id) ?? { x: 0, y: 0 },
            itemCount: items.filter((i) => i.personId === p.id).length,
          })),
        ),
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
  mapPosition?: MapPosition;
}

const placedPositions = (items: Item[]) =>
  items.flatMap((i) => (i.mapPosition ? [i.mapPosition] : []));

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
      // Placed once, into a free gap around the hub, so later changes never move it.
      mapPosition: input.mapPosition ?? placeItem(placedPositions(siblings)),
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

/** Put a deleted item back exactly as it was (used by Undo). */
export async function restoreItem(item: Item, database: PersonalDB = defaultDb): Promise<void> {
  await database.items.put(item);
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
      // The old position was relative to the old owner; take a free gap around the new one.
      mapPosition: placeItem(placedPositions(siblings.filter((i) => i.id !== id))),
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

/** Spread one person's cards evenly on rings around their hub (the hub itself stays). */
export async function relayoutPerson(
  personId: string,
  database: PersonalDB = defaultDb,
): Promise<void> {
  await database.transaction('rw', database.items, async () => {
    const items = (await database.items.where('personId').equals(personId).toArray()).sort(byOrder);
    const slots = ringLayout(items.length);
    await Promise.all(
      items.map((item, i) =>
        database.items.update(item.id, { mapPosition: itemRelativePosition(slots[i]) }),
      ),
    );
  });
}

/** Rebuild the whole map from scratch: clusters on a grid, cards evenly on rings. */
export async function resetMapLayout(database: PersonalDB = defaultDb): Promise<void> {
  await database.transaction('rw', database.people, database.items, async () => {
    const people = (await database.people.toArray()).sort(byOrder);
    const items = await database.items.toArray();
    const grid = layoutClusters(people.map((p) => items.filter((i) => i.personId === p.id).length));
    await Promise.all(people.map((p, i) => database.people.update(p.id, { mapPosition: grid[i] })));
    for (const p of people) await relayoutPerson(p.id, database);
  });
}

/**
 * Give a saved position to anything that has none (data from before positions were stored),
 * using the balanced layout for the gaps. Runs at startup; a no-op once everything is placed.
 */
export async function ensureMapPositions(database: PersonalDB = defaultDb): Promise<void> {
  await database.transaction('rw', database.people, database.items, async () => {
    const people = (await database.people.toArray()).sort(byOrder);
    const items = await database.items.toArray();
    if (people.every((p) => p.mapPosition) && items.every((i) => i.mapPosition)) return;
    const positions = personPositions(people, items);
    for (const p of people) {
      if (!p.mapPosition) await database.people.update(p.id, { mapPosition: positions.get(p.id) });
      const own = items.filter((i) => i.personId === p.id).sort(byOrder);
      if (own.every((i) => i.mapPosition)) continue;
      const slots = ringLayout(own.length);
      await Promise.all(
        own.map((item, i) =>
          item.mapPosition
            ? Promise.resolve()
            : database.items.update(item.id, { mapPosition: itemRelativePosition(slots[i]) }),
        ),
      );
    }
  });
}

export async function clearAllData(database: PersonalDB = defaultDb): Promise<void> {
  await database.transaction('rw', database.people, database.items, async () => {
    await database.items.clear();
    await database.people.clear();
  });
}
