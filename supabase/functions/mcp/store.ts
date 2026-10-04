import type { Change, Item, Person, Project, Snapshot, Store } from './model.ts';

/** The slice of a Supabase client the store needs; structural, so any supabase-js version fits. */
export interface Db {
  from(table: string): {
    select(columns: string): {
      is(
        column: string,
        value: null,
      ): PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>;
    };
  };
  rpc(
    fn: string,
    args: Record<string, unknown>,
  ): PromiseLike<{ error: { message: string } | null }>;
}

interface Row {
  id: string;
  kind: string;
  data: unknown;
}

/**
 * Reads and writes the user's records through the same table and function the devices use
 * (public.sync_records, sync_push()). The client is scoped to the user, so RLS decides what is
 * visible, and every write lands on their devices through the normal sync.
 */
export function supabaseStore(db: Db): Store {
  return {
    async load() {
      const { data, error } = await db
        .from('sync_records')
        .select('id, kind, data')
        .is('deleted_at', null);
      if (error) throw new Error(error.message);
      const snapshot: Snapshot = { people: [], items: [], projects: [] };
      for (const row of (data ?? []) as Row[]) {
        if (!row.data) continue;
        if (row.kind === 'person') snapshot.people.push(row.data as Person);
        else if (row.kind === 'item') snapshot.items.push(row.data as Item);
        else if (row.kind === 'project') snapshot.projects.push(row.data as Project);
      }
      snapshot.people.sort((a, b) => a.sortOrder - b.sortOrder);
      return snapshot;
    },
    async push(changes: Change[]) {
      const { error } = await db.rpc('sync_push', { changes });
      if (error) throw new Error(error.message);
    },
  };
}
