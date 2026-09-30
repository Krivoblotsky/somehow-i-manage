import { beforeEach, describe, expect, it } from 'vitest';
import {
  backupFilename,
  createBackup,
  parseBackup,
  restoreBackup,
  serializeBackup,
} from './backup';
import { PersonalDB } from './db';
import { createItem, createPerson } from './repository';

let db: PersonalDB;
beforeEach(() => {
  db = new PersonalDB(`test-${crypto.randomUUID()}`);
});

describe('backup round trip', () => {
  it('serialises everything and restores it into an empty database', async () => {
    const p = await createPerson({ name: 'Vira', contacts: [{ kind: 'slack', value: 'v' }] }, db);
    await createItem({ personId: p.id, title: 'Ship', body: '<p>x</p>' }, db);
    const text = serializeBackup(await createBackup(db));

    const parsed = parseBackup(text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.skippedItems).toBe(0);

    const target = new PersonalDB(`test-${crypto.randomUUID()}`);
    const counts = await restoreBackup(parsed.backup, 'replace', target);
    expect(counts).toEqual({ people: 1, items: 1 });
    expect(await target.people.get(p.id)).toEqual(await db.people.get(p.id));
  });

  it('merge keeps existing data and overwrites by id; replace wipes first', async () => {
    const keep = await createPerson({ name: 'Keep' }, db);
    const source = new PersonalDB(`test-${crypto.randomUUID()}`);
    const p = await createPerson({ name: 'From backup' }, source);
    await createItem({ personId: p.id, title: 'b1' }, source);
    const backup = await createBackup(source);

    await restoreBackup(backup, 'merge', db);
    expect((await db.people.toArray()).map((x) => x.name).sort()).toEqual(['From backup', 'Keep']);

    await restoreBackup(backup, 'replace', db);
    expect((await db.people.toArray()).map((x) => x.name)).toEqual(['From backup']);
    expect(await db.people.get(keep.id)).toBeUndefined();
  });
});

describe('parseBackup', () => {
  it('rejects non-JSON, foreign files and newer versions', () => {
    expect(parseBackup('nope')).toEqual({ ok: false, error: 'This is not a JSON file.' });
    expect(parseBackup('{"app":"other","version":1,"people":[],"items":[]}').ok).toBe(false);
    expect(parseBackup('{"app":"somehow-i-manage","version":99,"people":[],"items":[]}').ok).toBe(
      false,
    );
  });

  it('rejects malformed people and skips items without a person', () => {
    const person = {
      id: 'p',
      name: 'V',
      colorIndex: 0,
      sortOrder: 0,
      createdAt: 1,
      updatedAt: 1,
    };
    const item = {
      id: 'i',
      personId: 'p',
      kind: 'task',
      title: 't',
      body: '',
      isCompleted: false,
      isFlagged: false,
      sortOrder: 0,
      createdAt: 1,
      updatedAt: 1,
    };
    const orphan = { ...item, id: 'o', personId: 'ghost' };
    const good = parseBackup(
      JSON.stringify({
        app: 'somehow-i-manage',
        version: 1,
        people: [person],
        items: [item, orphan],
      }),
    );
    expect(good.ok).toBe(true);
    if (good.ok) {
      expect(good.backup.items.map((i) => i.id)).toEqual(['i']);
      expect(good.skippedItems).toBe(1);
    }
    const bad = parseBackup(
      JSON.stringify({ app: 'somehow-i-manage', version: 1, people: [{ id: 'p' }], items: [] }),
    );
    expect(bad).toEqual({ ok: false, error: 'Some people in the backup are malformed.' });
  });
});

describe('backupFilename', () => {
  it('is dated', () => {
    expect(backupFilename(new Date(Date.UTC(2026, 8, 30)))).toBe(
      'somehow-i-manage-backup-2026-09-30.json',
    );
  });
});
