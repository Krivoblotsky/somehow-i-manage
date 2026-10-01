import type { PersonalDB } from '../data/db';
import type { Item, Person } from '../model/types';
import { withoutChangeTracking, type OutboxEntry, type TrackedTable } from './changeLog';
import { deepEqual } from './deepEqual';
import type { RecordKind, SyncChange, SyncRow, SyncTransport } from './types';

const PULL_LIMIT = 500;
const PUSH_CHUNK = 200;

const KIND_OF: Record<TrackedTable, RecordKind> = { people: 'person', items: 'item' };
const TABLE_OF: Record<RecordKind, TrackedTable> = { person: 'people', item: 'items' };

export interface SyncReport {
  pulled: number;
  pushed: number;
}

/**
 * Moves changes between the local database and the server. Local-first: the UI never waits for
 * this. Pull applies what other devices did (last write wins, a change still waiting to upload
 * here beats an older remote one), then push uploads the outbox. Safe to call at any time; calls
 * that overlap are folded into one more round.
 */
export class SyncEngine {
  private running: Promise<SyncReport> | null = null;
  private again = false;
  private readonly db: PersonalDB;
  private readonly transport: SyncTransport;

  constructor(db: PersonalDB, transport: SyncTransport) {
    this.db = db;
    this.transport = transport;
  }

  /**
   * Before the first sync for a user on this device. Data from before anyone signed in belongs
   * to whoever signs in first: it is queued for upload with its own timestamps, and the cursor
   * rewinds so the whole account comes down. A different account than last time starts from an
   * empty cache instead — the previous user's data is not theirs. Same user again: no-op.
   */
  async prepareForUser(userId: string): Promise<void> {
    const known = await this.db.syncMeta.get('userId');
    if (known?.value === userId) return;
    const { db } = this;
    if (known !== undefined) {
      await withoutChangeTracking(db, [db.people, db.items, db.outbox, db.syncMeta], async () => {
        await Promise.all([db.people.clear(), db.items.clear(), db.outbox.clear()]);
        await db.syncMeta.delete('lastSyncedAt');
        await db.syncMeta.bulkPut([
          { key: 'userId', value: userId },
          { key: 'cursor', value: 0 },
        ]);
      });
      return;
    }
    await db.transaction('rw', [db.people, db.items, db.outbox, db.syncMeta], async () => {
      const [people, items] = await Promise.all([db.people.toArray(), db.items.toArray()]);
      const entries: OutboxEntry[] = [
        ...people.map((p) => ({
          table: 'people' as const,
          id: p.id,
          op: 'put' as const,
          queuedAt: p.updatedAt,
        })),
        ...items.map((i) => ({
          table: 'items' as const,
          id: i.id,
          op: 'put' as const,
          queuedAt: i.updatedAt,
        })),
      ];
      await db.outbox.bulkPut(entries);
      await db.syncMeta.bulkPut([
        { key: 'userId', value: userId },
        { key: 'cursor', value: 0 },
      ]);
    });
  }

  /** One round trip: pull, then push. Rejects on transport errors. */
  sync(): Promise<SyncReport> {
    if (this.running) {
      this.again = true;
      return this.running;
    }
    this.running = this.run().finally(() => {
      this.running = null;
    });
    return this.running;
  }

  private async run(): Promise<SyncReport> {
    const report: SyncReport = { pulled: 0, pushed: 0 };
    do {
      this.again = false;
      report.pulled += await this.pull();
      report.pushed += await this.push();
    } while (this.again);
    await this.db.syncMeta.put({ key: 'lastSyncedAt', value: Date.now() });
    return report;
  }

  private async pull(): Promise<number> {
    const { db } = this;
    let applied = 0;
    for (;;) {
      const cursor = Number((await db.syncMeta.get('cursor'))?.value ?? 0);
      const rows = await this.transport.pull(cursor, PULL_LIMIT);
      if (rows.length === 0) return applied;
      await withoutChangeTracking(db, [db.people, db.items, db.outbox, db.syncMeta], async () => {
        for (const row of rows) if (await this.applyRow(row)) applied++;
        await db.syncMeta.put({ key: 'cursor', value: rows[rows.length - 1].seq });
      });
      if (rows.length < PULL_LIMIT) return applied;
    }
  }

  /** Applies one server row locally. Returns whether anything changed. */
  private async applyRow(row: SyncRow): Promise<boolean> {
    const tableName = TABLE_OF[row.kind];
    const pending = await this.db.outbox.get([tableName, row.id]);
    // Edited here after the remote change was made: this device's version wins and uploads next.
    if (pending && pending.queuedAt >= row.updated_at) return false;

    if (row.kind === 'person') {
      const current = await this.db.people.get(row.id);
      if (row.deleted_at !== null || row.data === null) {
        if (!current) return false;
        await this.db.people.delete(row.id);
        return true;
      }
      if (current && deepEqual(current, row.data)) return false;
      await this.db.people.put(row.data as Person);
      return true;
    }
    const current = await this.db.items.get(row.id);
    if (row.deleted_at !== null || row.data === null) {
      if (!current) return false;
      await this.db.items.delete(row.id);
      return true;
    }
    if (current && deepEqual(current, row.data)) return false;
    await this.db.items.put(row.data as Item);
    return true;
  }

  private async push(): Promise<number> {
    const { db } = this;
    const entries = await db.outbox.toArray();
    let pushed = 0;
    for (let i = 0; i < entries.length; i += PUSH_CHUNK) {
      const chunk = entries.slice(i, i + PUSH_CHUNK);
      const changes: SyncChange[] = [];
      for (const entry of chunk) {
        const record =
          entry.op === 'put'
            ? entry.table === 'people'
              ? await db.people.get(entry.id)
              : await db.items.get(entry.id)
            : undefined;
        changes.push(
          record
            ? {
                id: entry.id,
                kind: KIND_OF[entry.table],
                data: record,
                updated_at: entry.queuedAt,
                deleted_at: null,
              }
            : {
                id: entry.id,
                kind: KIND_OF[entry.table],
                data: null,
                updated_at: entry.queuedAt,
                deleted_at: entry.queuedAt,
              },
        );
      }
      await this.transport.push(changes);
      pushed += changes.length;
      // Forget what went up — unless it changed again while the request was in flight.
      await db.transaction('rw', db.outbox, async () => {
        for (const entry of chunk) {
          const now = await db.outbox.get([entry.table, entry.id]);
          if (now && now.queuedAt === entry.queuedAt)
            await db.outbox.delete([entry.table, entry.id]);
        }
      });
    }
    return pushed;
  }
}
