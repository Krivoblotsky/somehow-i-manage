import type {
  DBCore,
  DBCoreMutateRequest,
  DBCoreMutateResponse,
  DBCoreTable,
  DBCoreTransaction,
  Middleware,
  Table,
} from 'dexie';
import type Dexie from 'dexie';

export const TRACKED_TABLES = ['people', 'items', 'projects'] as const;
export type TrackedTable = (typeof TRACKED_TABLES)[number];
export const OUTBOX_TABLE = 'outbox';

/** One pending upload: the latest thing that happened to a record on this device. */
export interface OutboxEntry {
  table: TrackedTable;
  id: string;
  op: 'put' | 'delete';
  /** When the change was made here (ms). Travels to the server as the record's version. */
  queuedAt: number;
}

interface FlaggedTransaction extends DBCoreTransaction {
  disableChangeTracking?: boolean;
}

function isTracked(name: string): name is TrackedTable {
  return (TRACKED_TABLES as readonly string[]).includes(name);
}

/**
 * Notes every change to people, items and projects in the outbox, inside the same transaction, so the
 * sync engine knows what to upload. Works below Dexie's API, so it sees the repository, the
 * seed, a restore — everything. Changes that come *from* the server are applied with tracking
 * off (see withoutChangeTracking) and are not noted, which is what stops the echo.
 */
export const changeLogMiddleware: Middleware<DBCore> = {
  stack: 'dbcore',
  name: 'changeLog',
  create(down) {
    return {
      ...down,
      transaction(stores, mode, options) {
        // Any write to a tracked table may need to write the outbox too.
        const needsOutbox =
          mode === 'readwrite' && stores.some(isTracked) && !stores.includes(OUTBOX_TABLE);
        return down.transaction(needsOutbox ? [...stores, OUTBOX_TABLE] : stores, mode, options);
      },
      table(name) {
        const table = down.table(name);
        if (!isTracked(name)) return table;
        return { ...table, mutate: (req) => trackMutation(down, table, name, req) };
      },
    };
  },
};

async function trackMutation(
  down: DBCore,
  table: DBCoreTable,
  name: TrackedTable,
  req: DBCoreMutateRequest,
): Promise<DBCoreMutateResponse> {
  if ((req.trans as FlaggedTransaction).disableChangeTracking) return table.mutate(req);

  const keyPath = table.schema.primaryKey.keyPath;
  let op: OutboxEntry['op'];
  let keys: unknown[];
  switch (req.type) {
    case 'add':
    case 'put':
      op = 'put';
      keys =
        req.keys ??
        req.values.map((v: Record<string, unknown>) =>
          typeof keyPath === 'string' ? v[keyPath] : undefined,
        );
      break;
    case 'delete':
      op = 'delete';
      keys = req.keys;
      break;
    case 'deleteRange': {
      // Table.clear() and friends: find out which records are about to go.
      op = 'delete';
      const { result } = await table.query({
        trans: req.trans,
        values: false,
        query: { index: table.schema.primaryKey, range: req.range },
      });
      keys = result;
      break;
    }
  }

  const response = await table.mutate(req);
  const queuedAt = Date.now();
  const entries: OutboxEntry[] = keys
    .filter((k): k is string => typeof k === 'string')
    .map((id) => ({ table: name, id, op, queuedAt }));
  if (entries.length > 0) {
    await down.table(OUTBOX_TABLE).mutate({ type: 'put', trans: req.trans, values: entries });
  }
  return response;
}

/**
 * Runs `fn` in a read-write transaction whose changes are not noted in the outbox: for applying
 * what the server sent. The tables must include everything `fn` touches.
 */
export function withoutChangeTracking<T>(
  db: Dexie,
  tables: Table[],
  fn: () => Promise<T>,
): Promise<T> {
  return db.transaction('rw', tables, (tx) => {
    (tx.idbtrans as unknown as FlaggedTransaction).disableChangeTracking = true;
    return fn();
  });
}
