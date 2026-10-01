import { beforeEach, describe, expect, it } from 'vitest';
import { PersonalDB } from '../data/db';
import { createItem, createPerson, deleteItem, updateItem, updatePerson } from '../data/repository';
import { SyncEngine } from './engine';
import type { SyncChange, SyncRow, SyncTransport } from './types';

/** What the Postgres side does: keep the newest version of each record, number every change. */
class FakeServer {
  rows = new Map<string, SyncRow>();
  seq = 0;
  pushes = 0;
  failNext = false;

  transport(): SyncTransport {
    return {
      pull: async (afterSeq, limit) =>
        [...this.rows.values()]
          .filter((r) => r.seq > afterSeq)
          .sort((a, b) => a.seq - b.seq)
          .slice(0, limit)
          .map((r) => ({ ...r, data: r.data ? JSON.parse(JSON.stringify(r.data)) : null })),
      push: async (changes: SyncChange[]) => {
        if (this.failNext) {
          this.failNext = false;
          throw new Error('network down');
        }
        this.pushes++;
        for (const c of changes) {
          const current = this.rows.get(c.id);
          if (current && current.updated_at > c.updated_at) continue; // stale device loses
          this.rows.set(c.id, { ...c, seq: ++this.seq });
        }
      },
    };
  }
}

let server: FakeServer;
let a: PersonalDB;
let b: PersonalDB;
let syncA: SyncEngine;
let syncB: SyncEngine;

beforeEach(async () => {
  server = new FakeServer();
  a = new PersonalDB(`a-${crypto.randomUUID()}`);
  b = new PersonalDB(`b-${crypto.randomUUID()}`);
  syncA = new SyncEngine(a, server.transport());
  syncB = new SyncEngine(b, server.transport());
  await syncA.prepareForUser('u1');
  await syncB.prepareForUser('u1');
});

const tick = () => new Promise((r) => setTimeout(r, 2));

describe('SyncEngine', () => {
  it('carries creates, edits and deletes from one device to another', async () => {
    const vira = await createPerson({ name: 'Vira' }, a);
    const item = await createItem({ personId: vira.id, title: 'Raise' }, a);
    expect(await syncA.sync()).toEqual({ pulled: 0, pushed: 2 });
    expect(await a.outbox.count()).toBe(0);

    expect(await syncB.sync()).toEqual({ pulled: 2, pushed: 0 });
    expect((await b.people.get(vira.id))?.name).toBe('Vira');
    expect((await b.items.get(item.id))?.title).toBe('Raise');
    expect(await b.outbox.count()).toBe(0); // applying from the server is not a local change

    await updateItem(item.id, { title: 'Raise (Q4)' }, b);
    await deleteItem(vira.id === '' ? '' : item.id, b);
    await syncB.sync();
    await syncA.sync();
    expect(await a.items.get(item.id)).toBeUndefined();
    expect(await a.people.count()).toBe(1);
  });

  it('lets the last write win, on the server and on a device with a pending edit', async () => {
    const p = await createPerson({ name: 'Nata' }, a);
    await syncA.sync();
    await syncB.sync();

    await updatePerson(p.id, { role: 'from A' }, a);
    await tick();
    await updatePerson(p.id, { role: 'from B, later' }, b);
    await syncB.sync(); // B's newer version reaches the server first
    await syncA.sync(); // A pulls B's version, then tries to push its older one
    expect((await a.people.get(p.id))?.role).toBe('from B, later');
    expect(server.rows.get(p.id)?.data).toMatchObject({ role: 'from B, later' });
    expect(await a.outbox.count()).toBe(0);
  });

  it('keeps an edit made while offline over an older remote one', async () => {
    const p = await createPerson({ name: 'Anton' }, a);
    await syncA.sync();
    await syncB.sync();

    await updatePerson(p.id, { role: 'older, from B' }, b);
    await syncB.sync();
    await tick();
    await updatePerson(p.id, { role: 'newer, from A' }, a); // not synced yet
    await syncA.sync(); // pull sees B's older change, keeps A's, then pushes A's
    expect((await a.people.get(p.id))?.role).toBe('newer, from A');
    await syncB.sync();
    expect((await b.people.get(p.id))?.role).toBe('newer, from A');
  });

  it('uploads what was on the device before the first sign-in and merges both sides', async () => {
    const c = new PersonalDB(`c-${crypto.randomUUID()}`);
    const local = await createPerson({ name: 'Local only' }, c);
    await c.outbox.clear(); // pretend it was created long before sync existed
    const remote = await createPerson({ name: 'Remote only' }, a);
    await syncA.sync();

    const syncC = new SyncEngine(c, server.transport());
    await syncC.prepareForUser('u1');
    await syncC.sync();
    expect((await c.people.toArray()).map((p) => p.name).sort()).toEqual([
      'Local only',
      'Remote only',
    ]);
    expect(server.rows.has(local.id)).toBe(true);
    expect(server.rows.has(remote.id)).toBe(true);

    // signing in again as the same user changes nothing
    await syncC.prepareForUser('u1');
    expect(await c.outbox.count()).toBe(0);
  });

  it('keeps changes queued when the upload fails and retries them next time', async () => {
    await createPerson({ name: 'Vira' }, a);
    server.failNext = true;
    await expect(syncA.sync()).rejects.toThrow('network down');
    expect(await a.outbox.count()).toBe(1);
    await syncA.sync();
    expect(await a.outbox.count()).toBe(0);
    expect(server.rows.size).toBe(1);
  });

  it('does not write anything when a pull only echoes what this device uploaded', async () => {
    const p = await createPerson({ name: 'Vira' }, a);
    await syncA.sync();
    const before = (await a.people.get(p.id))?.updatedAt;
    const report = await syncA.sync(); // pulls back its own row
    expect(report).toEqual({ pulled: 0, pushed: 0 });
    expect((await a.people.get(p.id))?.updatedAt).toBe(before);
    expect(await a.outbox.count()).toBe(0);
  });

  it('folds a sync requested mid-flight into one extra round', async () => {
    await createPerson({ name: 'Vira' }, a);
    const first = syncA.sync();
    const second = syncA.sync();
    expect(second).toBe(first);
    await first;
    expect(server.pushes).toBe(1);
  });
});

describe('SyncEngine · switching accounts on one device', () => {
  it('starts a different account from an empty cache and uploads nothing of the previous one', async () => {
    await createPerson({ name: 'Belongs to u1' }, a);
    await syncA.sync();
    expect(await a.people.count()).toBe(1);

    const otherAccount = new FakeServer();
    const asU2 = new SyncEngine(a, otherAccount.transport());
    await asU2.prepareForUser('u2');
    expect(await a.people.count()).toBe(0);
    expect(await a.outbox.count()).toBe(0);
    expect((await a.syncMeta.get('cursor'))?.value).toBe(0);

    await asU2.sync();
    expect(otherAccount.rows.size).toBe(0);
    expect(server.rows.size).toBe(1); // u1's data is still where it belongs
  });
});
