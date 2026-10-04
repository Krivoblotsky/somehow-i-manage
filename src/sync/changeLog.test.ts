import { beforeEach, describe, expect, it } from 'vitest';
import { restoreBackup } from '../data/backup';
import { PersonalDB } from '../data/db';
import {
  clearAllData,
  createItem,
  createPerson,
  deletePerson,
  setItemDiscussed,
  updatePerson,
} from '../data/repository';
import { withoutChangeTracking } from './changeLog';

let db: PersonalDB;
beforeEach(() => {
  db = new PersonalDB(`test-${crypto.randomUUID()}`);
});

const outbox = () => db.outbox.toArray();

describe('change log middleware', () => {
  it('notes creates, folds later edits into the same entry, and notes deletes', async () => {
    const p = await createPerson({ name: 'Vira' }, db);
    expect(await outbox()).toEqual([
      { table: 'people', id: p.id, op: 'put', queuedAt: expect.any(Number) },
    ]);
    const first = (await outbox())[0].queuedAt;

    await new Promise((r) => setTimeout(r, 2));
    await updatePerson(p.id, { role: 'PM' }, db);
    const afterEdit = await outbox();
    expect(afterEdit).toHaveLength(1);
    expect(afterEdit[0].op).toBe('put');
    expect(afterEdit[0].queuedAt).toBeGreaterThan(first);

    const item = await createItem({ personId: p.id, title: 'Raise' }, db);
    await setItemDiscussed(item.id, true, db); // even writes that leave updatedAt alone count
    await deletePerson(p.id, db); // takes the items with it
    const entries = (await outbox()).sort((a, b) => a.table.localeCompare(b.table));
    expect(entries.map((e) => [e.table, e.id, e.op])).toEqual([
      ['items', item.id, 'delete'],
      ['people', p.id, 'delete'],
    ]);
  });

  it('notes what a clear() and a restore touch', async () => {
    const p = await createPerson({ name: 'Nata' }, db);
    const item = await createItem({ personId: p.id, title: 'Tickets' }, db);
    await clearAllData(db);
    const cleared = await outbox();
    expect(cleared.map((e) => [e.id, e.op]).sort()).toEqual(
      [
        [p.id, 'delete'],
        [item.id, 'delete'],
      ].sort(),
    );

    await restoreBackup(
      {
        app: 'somehow-i-manage',
        version: 1,
        exportedAt: '2026-09-30T00:00:00.000Z',
        people: [{ ...p, name: 'Nata again' }],
        items: [],
        projects: [],
      },
      'replace',
      db,
    );
    expect(await db.outbox.get(['people', p.id])).toMatchObject({ op: 'put' });
  });

  it('does not note changes applied from the server', async () => {
    const p = await createPerson({ name: 'Anton' }, db);
    await db.outbox.clear();
    await withoutChangeTracking(db, [db.people, db.items, db.outbox], async () => {
      await db.people.put({ ...p, name: 'Anton (server)' });
      await db.items.put({
        id: 'remote-1',
        personId: p.id,
        kind: 'task',
        title: 'From another device',
        body: '',
        isCompleted: false,
        isFlagged: false,
        sortOrder: 0,
        createdAt: 1,
        updatedAt: 1,
      });
      await db.people.delete('nobody');
    });
    expect(await outbox()).toEqual([]);
    expect((await db.people.get(p.id))?.name).toBe('Anton (server)');
    expect(await db.items.count()).toBe(1);
  });

  it('keeps the outbox out of the way of ordinary queries', async () => {
    const p = await createPerson({ name: 'Vira' }, db);
    expect(await db.people.count()).toBe(1);
    expect(await db.people.get(p.id)).toMatchObject({ name: 'Vira' });
    expect(await db.items.where('personId').equals(p.id).toArray()).toEqual([]);
  });
});
