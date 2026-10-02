import { liveQuery } from 'dexie';
import { db } from '../data/db';
import { isSyncConfigured } from './config';
import { SyncEngine } from './engine';
import { useSync } from './store';
import {
  consumeAuthRedirect,
  getSupabase,
  subscribeToChanges,
  supabaseAuth,
  supabaseTransport,
} from './supabase';
import type { SyncAuth, SyncUser } from './types';

const RETRY_MS = 60_000;
const HEARTBEAT_MS = 5 * 60_000;

let started = false;
let engine: SyncEngine | null = null;
let auth: SyncAuth | null = null;
let unsubscribeRealtime: (() => void) | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;

/**
 * Wires the sync engine to the app: the signed-in user, the outbox, connectivity, visibility,
 * server pushes. Call once at startup; does nothing when this build has no backend configured.
 */
export async function startSync(): Promise<void> {
  if (started || !isSyncConfigured()) return;
  started = true;
  let client;
  try {
    client = await getSupabase();
  } catch (e) {
    useSync.setState({ ready: true, authError: e instanceof Error ? e.message : String(e) });
    return;
  }
  auth = supabaseAuth(client);
  engine = new SyncEngine(db, supabaseTransport(client));

  const last = await db.syncMeta.get('lastSyncedAt');
  if (last) useSync.setState({ lastSyncedAt: Number(last.value) });

  liveQuery(() => db.outbox.count()).subscribe({
    next: (pending) => {
      useSync.setState({ pending });
      if (pending > 0) scheduleSync(800);
    },
    error: () => undefined,
  });
  window.addEventListener('online', () => {
    useSync.setState({ online: true });
    scheduleSync(0);
  });
  window.addEventListener('offline', () => useSync.setState({ online: false }));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') scheduleSync(0);
  });
  setInterval(() => scheduleSync(0), HEARTBEAT_MS);

  const user = await auth.getUser();
  useSync.setState({ ready: true, authError: consumeAuthRedirect() });
  await applyUser(user);
  auth.onChange((user) => void applyUser(user));
}

async function applyUser(user: SyncUser | null): Promise<void> {
  const previous = useSync.getState().user;
  // Token refreshes report the same user; nothing to redo then.
  if (user && previous?.id === user.id && unsubscribeRealtime) return;
  useSync.setState({ user, error: null, phase: 'idle' });
  unsubscribeRealtime?.();
  unsubscribeRealtime = null;
  if (!user || !engine) return;
  await engine.prepareForUser(user.id);
  const client = await getSupabase();
  unsubscribeRealtime = subscribeToChanges(client, user.id, () => scheduleSync(300));
  scheduleSync(0);
}

function scheduleSync(delayMs: number): void {
  clearTimeout(timer);
  timer = setTimeout(() => void syncNow(), delayMs);
}

/** One round trip now, if signed in and online. Errors land in the store, not in the caller. */
export async function syncNow(): Promise<void> {
  const { user, online } = useSync.getState();
  if (!engine || !user || !online) return;
  useSync.setState({ phase: 'syncing' });
  try {
    await engine.sync();
    useSync.setState({ phase: 'idle', error: null, lastSyncedAt: Date.now() });
  } catch (e) {
    useSync.setState({ phase: 'error', error: e instanceof Error ? e.message : String(e) });
    scheduleSync(RETRY_MS);
  }
}

function requireAuth(): SyncAuth {
  if (!auth) throw new Error('Sync is not configured for this build.');
  return auth;
}

/** What the sync dialog calls. */
export const syncActions = {
  signInWithGoogle: () => requireAuth().signInWithGoogle(),
  signInWithMicrosoft: () => requireAuth().signInWithMicrosoft(),
  signInWithPasskey: () => requireAuth().signInWithPasskey(),
  registerPasskey: () => requireAuth().registerPasskey(),
  listPasskeys: () => requireAuth().listPasskeys(),
  deletePasskey: (id: string) => requireAuth().deletePasskey(id),
  signOut: () => requireAuth().signOut(),
  syncNow,
};
export type SyncActions = typeof syncActions;
