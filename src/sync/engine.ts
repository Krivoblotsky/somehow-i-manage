import type { Table } from 'dexie';
import type { PersonalDB } from '../data/db';
import type { Item, Person, Project } from '../model/types';
import { withoutChangeTracking, type OutboxEntry, type TrackedTable } from './changeLog';
import { deepEqual } from './deepEqual';
import type { RecordKind, SyncChange, SyncRow, SyncTransport } from './types';

const PULL_LIMIT = 500;
const PUSH_CHUNK = 200;

const KIND_OF: Record<TrackedTable, RecordKind> = {
  people: 'person',
  items: 'item',
  projects: 'project',
};
const TABLE_OF: Record<RecordKind, TrackedTable> = {
  person: 'people',
  item: 'items',
  project: 'projects',
};

type SyncRecord = Person | Item | Project;

/** The kinds this build understands, as one string to compare with what ran here before. */
const KNOWN_KINDS = Object.keys(TABLE_OF).sort().join(',');
const isKnownKind = (kind: string): kind is RecordKind => Object.hasOwn(TABLE_OF, kind);

/** The synced tables, the account's cache: cleared together when the account changes. */
const synced = (db: PersonalDB) => [db.people, db.items, db.projects];
const everything = (db: PersonalDB) => [...synced(db), db.outbox, db.syncMeta];

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
  /** Empties this device's cache without recording the deletions: the account is gone. */
  async wipeLocal(): Promise<void> {
    const { db } = this;
    await withoutChangeTracking(db, everything(db), async () => {
      await Promise.all(everything(db).map((table) => table.clear()));
    });
  }

  async prepareForUser(userId: string): Promise<void> {
    const known = await this.db.syncMeta.get('userId');
    if (known?.value === userId) {
      await this.rewindIfKindsChanged();
      return;
    }
    const { db } = this;
    if (known !== undefined) {
      await withoutChangeTracking(db, everything(db), async () => {
        await Promise.all([...synced(db), db.outbox].map((table) => table.clear()));
        await db.syncMeta.delete('lastSyncedAt');
        await db.syncMeta.bulkPut([
          { key: 'userId', value: userId },
          { key: 'cursor', value: 0 },
          { key: 'kinds', value: KNOWN_KINDS },
        ]);
      });
      return;
    }
    await db.transaction('rw', everything(db), async () => {
      const [people, items, projects] = await Promise.all([
        db.people.toArray(),
        db.items.toArray(),
        db.projects.toArray(),
      ]);
      const queue = (table: TrackedTable, records: SyncRecord[]): OutboxEntry[] =>
        records.map((r) => ({ table, id: r.id, op: 'put' as const, queuedAt: r.updatedAt }));
      const entries: OutboxEntry[] = [
        ...queue('people', people),
        ...queue('items', items),
        ...queue('projects', projects),
      ];
      await db.outbox.bulkPut(entries);
      await db.syncMeta.bulkPut([
        { key: 'userId', value: userId },
        { key: 'cursor', value: 0 },
        { key: 'kinds', value: KNOWN_KINDS },
      ]);
    });
  }

  /**
   * An older build skips rows of kinds it does not know (see applyRow) and still moves its cursor
   * past them. The first run of a build that knows more kinds therefore starts over from the
   * beginning: re-applying rows it already has is a no-op, and the skipped ones finally land.
   */
  private async rewindIfKindsChanged(): Promise<void> {
    const kinds = await this.db.syncMeta.get('kinds');
    if (kinds?.value === KNOWN_KINDS) return;
    await this.db.syncMeta.bulkPut([
      { key: 'cursor', value: 0 },
      { key: 'kinds', value: KNOWN_KINDS },
    ]);
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
      // A kind this build does not know (a newer build wrote it) is left alone rather than
      // failing the whole sync; rewindIfKindsChanged() fetches it once this device is updated.
      // Filtered before the transaction: a row that touches no table would let it auto-commit.
      const known = rows.filter((row) => isKnownKind(row.kind));
      await withoutChangeTracking(db, everything(db), async () => {
        for (const row of known) if (await this.applyRow(row)) applied++;
        await db.syncMeta.put({ key: 'cursor', value: rows[rows.length - 1].seq });
      });
      if (rows.length < PULL_LIMIT) return applied;
    }
  }

  /** The local table for a record kind, typed loosely: the three tables share the sync shape. */
  private tableFor(kind: RecordKind): Table<SyncRecord, string> {
    const { db } = this;
    const table = kind === 'person' ? db.people : kind === 'item' ? db.items : db.projects;
    return table as unknown as Table<SyncRecord, string>;
  }

  /** Applies one server row (of a known kind) locally. Returns whether anything changed. */
  private async applyRow(row: SyncRow): Promise<boolean> {
    const pending = await this.db.outbox.get([TABLE_OF[row.kind], row.id]);
    // Edited here after the remote change was made: this device's version wins and uploads next.
    if (pending && pending.queuedAt >= row.updated_at) return false;

    const table = this.tableFor(row.kind);
    const current = await table.get(row.id);
    if (row.deleted_at !== null || row.data === null) {
      if (!current) return false;
      await table.delete(row.id);
      return true;
    }
    if (current && deepEqual(current, row.data)) return false;
    await table.put(row.data);
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
          entry.op === 'put' ? await this.tableFor(KIND_OF[entry.table]).get(entry.id) : undefined;
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
