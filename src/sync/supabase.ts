import type { SupabaseClient, User } from '@supabase/supabase-js';
import { SYNC_CONFIG } from './config';
import { describePasskeyError } from './passkeys';
import type { Passkey, RecordKind, SyncAuth, SyncRow, SyncTransport, SyncUser } from './types';

let clientPromise: Promise<SupabaseClient> | null = null;

/** The supabase-js bundle loads only when sync is configured, and only once. */
export function getSupabase(): Promise<SupabaseClient> {
  const config = SYNC_CONFIG;
  if (!config) return Promise.reject(new Error('Sync is not configured for this build.'));
  clientPromise ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    }),
  );
  return clientPromise;
}

interface RawRow {
  id: string;
  kind: string;
  data: unknown;
  updated_at: number | string;
  deleted_at: number | string | null;
  seq: number | string;
}

const fail = (error: { message: string } | null): void => {
  if (error) throw new Error(error.message);
};

/** Reads and writes public.sync_records (see supabase/schema.sql). */
export function supabaseTransport(client: SupabaseClient): SyncTransport {
  return {
    async pull(afterSeq, limit) {
      const { data, error } = await client
        .from('sync_records')
        .select('id, kind, data, updated_at, deleted_at, seq')
        .gt('seq', afterSeq)
        .order('seq', { ascending: true })
        .limit(limit);
      fail(error);
      return ((data ?? []) as RawRow[]).map((r) => ({
        id: String(r.id),
        kind: r.kind as RecordKind,
        data: r.data as SyncRow['data'],
        updated_at: Number(r.updated_at),
        deleted_at: r.deleted_at === null ? null : Number(r.deleted_at),
        seq: Number(r.seq),
      }));
    },
    async push(changes) {
      const { error } = await client.rpc('sync_push', { changes });
      fail(error);
    },
  };
}

/** Where Google sends the browser back to: this app, at its base path. */
export function appUrl(): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}`;
}

/**
 * After the round trip to Google the URL carries `?code=` (or an error). Cleans it up and
 * returns the error message, if any, so the app can show it.
 */
export function consumeAuthRedirect(): string | null {
  const url = new URL(window.location.href);
  const hash = new URLSearchParams(url.hash.replace(/^#/, ''));
  const error = url.searchParams.get('error_description') ?? hash.get('error_description');
  const touched =
    url.searchParams.has('code') ||
    url.searchParams.has('error') ||
    hash.has('access_token') ||
    hash.has('error');
  if (touched) {
    for (const key of ['code', 'error', 'error_code', 'error_description'])
      url.searchParams.delete(key);
    url.hash = '';
    window.history.replaceState(window.history.state, '', url.toString());
  }
  return error ? error.replace(/\+/g, ' ') : null;
}

/**
 * Fetches the authorize URL without following it. A working provider answers with a redirect
 * (opaque to us, which is fine); a misconfigured one answers 4xx with a message worth showing.
 */
async function authorizeProblem(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { redirect: 'manual', credentials: 'omit' });
    if (response.type === 'opaqueredirect' || response.ok) return null;
    const body = (await response.json().catch(() => null)) as { msg?: string } | null;
    return body?.msg ?? `Sign-in is not available (HTTP ${response.status}).`;
  } catch {
    return null; // cannot tell from here; let the browser go and see
  }
}

/** What Supabase returns for a passkey, in either list or registration shape. */
interface RawPasskey {
  id: string;
  friendly_name?: string;
  created_at: string;
  last_used_at?: string;
}

/** Google, Microsoft and passkey sign-in through Supabase Auth. */
export function supabaseAuth(client: SupabaseClient): SyncAuth {
  /** The OAuth round trip: the browser leaves for the provider and comes back signed in. */
  async function oauth(provider: 'google' | 'azure', label: string, scopes?: string) {
    const { data, error } = await client.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: appUrl(),
        skipBrowserRedirect: true,
        scopes,
        queryParams: { prompt: 'select_account' },
      },
    });
    fail(error);
    if (!data.url) throw new Error(`${label} sign-in is unavailable right now.`);
    // A provider that is not enabled yet would show a bare JSON page; ask first.
    const problem = await authorizeProblem(data.url);
    if (problem) throw new Error(problem);
    window.location.assign(data.url);
  }
  const toPasskey = (p: RawPasskey): Passkey => ({
    id: p.id,
    name: p.friendly_name || undefined,
    createdAt: Date.parse(p.created_at),
    lastUsedAt: p.last_used_at ? Date.parse(p.last_used_at) : undefined,
  });
  const failPasskey = (error: { name?: string; message: string } | null): void => {
    if (error) throw new Error(describePasskeyError(error));
  };
  const toUser = (u: User | null | undefined): SyncUser | null => {
    if (!u) return null;
    const meta = u.user_metadata as Record<string, unknown>;
    const str = (v: unknown): string | undefined => (typeof v === 'string' && v ? v : undefined);
    return {
      id: u.id,
      email: u.email ?? undefined,
      name: str(meta.full_name) ?? str(meta.name),
      avatarUrl: str(meta.avatar_url) ?? str(meta.picture),
    };
  };
  return {
    async getUser() {
      const { data } = await client.auth.getSession();
      return toUser(data.session?.user);
    },
    onChange(listener) {
      const { data } = client.auth.onAuthStateChange((_event, session) =>
        listener(toUser(session?.user)),
      );
      return () => data.subscription.unsubscribe();
    },
    signInWithGoogle: () => oauth('google', 'Google'),
    // Azure only returns an email when asked, and Supabase needs one to make the account.
    signInWithMicrosoft: () => oauth('azure', 'Microsoft', 'email'),
    async signInWithPasskey() {
      // The authenticator picks the account from the credential; the session is set on success.
      const { error } = await client.auth.signInWithPasskey();
      failPasskey(error);
    },
    async registerPasskey() {
      const { data, error } = await client.auth.registerPasskey();
      failPasskey(error);
      if (!data) throw new Error('No passkey was created.');
      return toPasskey(data);
    },
    async listPasskeys() {
      const { data, error } = await client.auth.passkey.list();
      fail(error);
      return (data ?? []).map(toPasskey);
    },
    async deletePasskey(id) {
      const { error } = await client.auth.passkey.delete({ passkeyId: id });
      fail(error);
    },
    async signOut() {
      const { error } = await client.auth.signOut();
      fail(error);
    },
    async deleteAccount() {
      const { error } = await client.rpc('delete_my_account');
      fail(error);
      // the server no longer knows this session; drop it here without asking it to
      await client.auth.signOut({ scope: 'local' }).catch(() => undefined);
    },
  };
}

/** Tells `onChange` whenever a row of this user's changes on the server. Returns unsubscribe. */
export function subscribeToChanges(
  client: SupabaseClient,
  userId: string,
  onChange: () => void,
): () => void {
  const channel = client
    .channel(`sync-${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'sync_records', filter: `user_id=eq.${userId}` },
      () => onChange(),
    )
    .subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}
