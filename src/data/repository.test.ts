import { beforeEach, describe, expect, it } from 'vitest';
import { PersonalDB } from './db';
import {
  bulkAddItems,
  createItem,
  createPerson,
  deleteItem,
  deletePerson,
  ensureMapPositions,
  moveItem,
  recordMeeting,
  relayoutPerson,
  resetMapLayout,
  restoreItem,
  setItemDiscussed,
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

  it('stores contacts trimmed and in canonical order', async () => {
    const p = await createPerson(
      {
        name: 'V',
        contacts: [
          { kind: 'slack', value: ' vira ' },
          { kind: 'phone', value: '' },
          { kind: 'email', value: 'v@x.com' },
        ],
      },
      db,
    );
    expect(p.contacts).toEqual([
      { kind: 'email', value: 'v@x.com' },
      { kind: 'slack', value: 'vira' },
    ]);
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
    const b1 = await createItem({ personId: b.id, title: 'b1' }, db);
    const item = await createItem({ personId: a.id, title: 'a1' }, db);
    await db.items.update(item.id, { mapPosition: { x: 10, y: 20 } });

    await moveItem(item.id, b.id, db);
    const moved = await db.items.get(item.id);
    expect(moved?.personId).toBe(b.id);
    expect(moved?.sortOrder).toBe(1);
    // relative to the new owner, and not on top of b1
    expect(moved?.mapPosition).not.toEqual({ x: 10, y: 20 });
    expect(moved?.mapPosition).not.toEqual((await db.items.get(b1.id))?.mapPosition);
  });

  it('restores a deleted item exactly as it was', async () => {
    const p = await createPerson({ name: 'A' }, db);
    const item = await createItem({ personId: p.id, title: 'Keep me', isCompleted: true }, db);
    await deleteItem(item.id, db);
    expect(await db.items.get(item.id)).toBeUndefined();
    await restoreItem(item, db);
    expect(await db.items.get(item.id)).toEqual(item);
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

describe('map positions', () => {
  it('places every new person and item, and deleting one leaves the others where they were', async () => {
    const a = await createPerson({ name: 'A' }, db);
    const b = await createPerson({ name: 'B' }, db);
    expect(a.mapPosition).toBeDefined();
    expect(b.mapPosition).toBeDefined();
    expect(b.mapPosition!.x).toBeGreaterThan(a.mapPosition!.x);

    const items = [];
    for (let i = 0; i < 4; i++)
      items.push(await createItem({ personId: a.id, title: `t${i}` }, db));
    const before = new Map(items.map((i) => [i.id, i.mapPosition]));

    await deleteItem(items[1].id, db);

    for (const item of await db.items.toArray()) {
      expect(item.mapPosition).toEqual(before.get(item.id));
    }
  });

  it('relayoutPerson spreads cards evenly and resetMapLayout re-grids everything', async () => {
    const a = await createPerson({ name: 'A' }, db);
    const b = await createPerson({ name: 'B' }, db);
    for (let i = 0; i < 3; i++) await createItem({ personId: a.id, title: `t${i}` }, db);
    await db.people.update(a.id, { mapPosition: { x: 5000, y: 5000 } });

    await relayoutPerson(a.id, db);
    const spread = (await db.items.where('personId').equals(a.id).toArray()).map(
      (i) => i.mapPosition,
    );
    expect(new Set(spread.map((p) => JSON.stringify(p))).size).toBe(3);
    expect((await db.people.get(a.id))?.mapPosition).toEqual({ x: 5000, y: 5000 }); // hub kept

    await resetMapLayout(db);
    const people = await db.people.toArray();
    expect(people.find((p) => p.id === a.id)?.mapPosition).not.toEqual({ x: 5000, y: 5000 });
    expect(people.find((p) => p.id === b.id)?.mapPosition).toBeDefined();
  });

  it('ensureMapPositions fills only what is missing', async () => {
    const a = await createPerson({ name: 'A' }, db);
    const keep = await createItem({ personId: a.id, title: 'keep' }, db);
    const legacy = await createItem({ personId: a.id, title: 'legacy' }, db);
    await db.people.update(a.id, { mapPosition: undefined });
    await db.items.update(legacy.id, { mapPosition: undefined });

    await ensureMapPositions(db);

    expect((await db.people.get(a.id))?.mapPosition).toBeDefined();
    expect((await db.items.get(legacy.id))?.mapPosition).toBeDefined();
    expect((await db.items.get(keep.id))?.mapPosition).toEqual(keep.mapPosition);
  });
});

describe('1:1 meetings', () => {
  it('records meetings in order and marks items as discussed without editing them', async () => {
    const p = await createPerson({ name: 'Vira' }, db);
    await recordMeeting(p.id, { startedAt: 1, endedAt: 2 }, db);
    await recordMeeting(p.id, { startedAt: 3, endedAt: 4 }, db);
    expect((await db.people.get(p.id))?.meetings).toEqual([
      { startedAt: 1, endedAt: 2 },
      { startedAt: 3, endedAt: 4 },
    ]);

    const item = await createItem({ personId: p.id, title: 'Raise' }, db);
    await setItemDiscussed(item.id, true, db);
    const discussed = await db.items.get(item.id);
    expect(discussed?.discussedAt).toBeGreaterThan(0);
    expect(discussed?.updatedAt).toBe(item.updatedAt);

    await setItemDiscussed(item.id, false, db);
    expect((await db.items.get(item.id))?.discussedAt).toBeUndefined();
  });
});

describe('projects', () => {
  it('creates once per name, tags items, and untags them when the project goes', async () => {
    const { createProject, deleteProject, renameProject, setItemProject } =
      await import('./repository');
    const vira = await createPerson({ name: 'Vira' }, db);
    const mipp = await createProject('  MIPP ', db);
    expect(mipp.name).toBe('MIPP');
    expect(mipp.colorIndex).toBe(0);
    // same name again (any case) is the same project
    expect((await createProject('mipp', db)).id).toBe(mipp.id);
    const hiring = await createProject('Hiring', db);
    expect(hiring.colorIndex).toBe(1);
    expect(hiring.sortOrder).toBe(mipp.sortOrder + 1);

    const task = await createItem({ personId: vira.id, title: 'Launch', projectId: mipp.id }, db);
    const note = await createItem({ personId: vira.id, kind: 'note', title: 'Notes' }, db);
    await setItemProject(note.id, mipp.id, db);
    expect((await db.items.get(note.id))?.projectId).toBe(mipp.id);

    await renameProject(mipp.id, ' MIPP 2026 ', db);
    expect((await db.projects.get(mipp.id))?.name).toBe('MIPP 2026');

    const before = (await db.items.get(task.id))!.updatedAt;
    await new Promise((r) => setTimeout(r, 2));
    await deleteProject(mipp.id, db);
    expect(await db.projects.get(mipp.id)).toBeUndefined();
    const after = (await db.items.get(task.id))!;
    expect(after.projectId).toBeUndefined();
    expect(after.updatedAt).toBeGreaterThan(before); // an edit, so it syncs
    expect((await db.items.get(note.id))?.projectId).toBeUndefined();
    expect(await db.projects.count()).toBe(1);
  });
});
