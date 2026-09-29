import { beforeEach, describe, expect, it } from 'vitest';
import { PersonalDB } from './db';
import {
  bulkAddItems,
  createItem,
  createPerson,
  deletePerson,
  moveItem,
  setItemKind,
  toggleItemCompleted,
} from './repository';

let db: PersonalDB;

beforeEach(() => {
  db = new PersonalDB(`test-${crypto.randomUUID()}`);
});

describe('people', () => {
  it('assigns palette colours in order and increasing sortOrder', async () => {
    const a = await createPerson({ name: '  Nata ' }, db);
    const b = await createPerson({ name: 'Vira' }, db);
    expect(a.name).toBe('Nata');
    expect(a.colorIndex).toBe(0);
    expect(b.colorIndex).toBe(1);
    expect(b.sortOrder).toBe(a.sortOrder + 1);
  });

  it('reuses the least-used colour once the palette wraps', async () => {
    for (let i = 0; i < 6; i++) await createPerson({ name: `P${i}` }, db);
    const seventh = await createPerson({ name: 'P7' }, db);
    expect(seventh.colorIndex).toBe(0);
  });

  it('deleting a person deletes their items and nobody else’s', async () => {
    const a = await createPerson({ name: 'A' }, db);
    const b = await createPerson({ name: 'B' }, db);
    await createItem({ personId: a.id, title: 'a1' }, db);
    await createItem({ personId: a.id, title: 'a2' }, db);
    const keep = await createItem({ personId: b.id, title: 'b1' }, db);

    await deletePerson(a.id, db);

    expect(await db.people.count()).toBe(1);
    expect((await db.items.toArray()).map((i) => i.id)).toEqual([keep.id]);
  });
});

describe('items', () => {
  it('toggling completion stamps and clears completedAt', async () => {
    const p = await createPerson({ name: 'A' }, db);
    const item = await createItem({ personId: p.id, title: 'Do it' }, db);
    expect(item.isCompleted).toBe(false);

    await toggleItemCompleted(item.id, db);
    const done = await db.items.get(item.id);
    expect(done?.isCompleted).toBe(true);
    expect(done?.completedAt).toBeTypeOf('number');

    await toggleItemCompleted(item.id, db);
    const undone = await db.items.get(item.id);
    expect(undone?.isCompleted).toBe(false);
    expect(undone?.completedAt).toBeUndefined();
  });

  it('turning a task into a note drops completion', async () => {
    const p = await createPerson({ name: 'A' }, db);
    const item = await createItem({ personId: p.id, title: 'x', isCompleted: true }, db);
    await setItemKind(item.id, 'note', db);
    const note = await db.items.get(item.id);
    expect(note?.kind).toBe('note');
    expect(note?.isCompleted).toBe(false);
  });

  it('a note is never created completed', async () => {
    const p = await createPerson({ name: 'A' }, db);
    const note = await createItem({ personId: p.id, kind: 'note', isCompleted: true }, db);
    expect(note.isCompleted).toBe(false);
  });

  it('moves an item to another person at the end of their list', async () => {
    const a = await createPerson({ name: 'A' }, db);
    const b = await createPerson({ name: 'B' }, db);
    await createItem({ personId: b.id, title: 'b1' }, db);
    const item = await createItem({ personId: a.id, title: 'a1' }, db);

    await moveItem(item.id, b.id, db);
    const moved = await db.items.get(item.id);
    expect(moved?.personId).toBe(b.id);
    expect(moved?.sortOrder).toBe(1);
  });

  it('bulk-adds a pasted list in order', async () => {
    const p = await createPerson({ name: 'A' }, db);
    const created = await bulkAddItems(
      p.id,
      ['- Promotion next steps', '- [x] Buy tickets', '# Retro feedback', '', '   '].join('\n'),
      db,
    );
    expect(created.map((i) => [i.kind, i.title, i.isCompleted])).toEqual([
      ['task', 'Promotion next steps', false],
      ['task', 'Buy tickets', true],
      ['note', 'Retro feedback', false],
    ]);
    expect(created.map((i) => i.sortOrder)).toEqual([0, 1, 2]);
  });
});
