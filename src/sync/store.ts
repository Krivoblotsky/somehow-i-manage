import { create } from 'zustand';
import { isSyncConfigured } from './config';
import type { SyncPhase, SyncUser } from './types';

export interface SyncState {
  /** Whether this build knows a backend at all. */
  configured: boolean;
  /** False until the saved session has been checked once; the gate waits for it. */
  ready: boolean;
  user: SyncUser | null;
  /** What Google or Supabase said when a sign-in round trip failed. */
  authError: string | null;
  phase: SyncPhase;
  online: boolean;
  /** Local changes not uploaded yet. */
  pending: number;
  lastSyncedAt: number | null;
  error: string | null;
}

/** What the header badge and the sync dialog show. Written by src/sync/controller.ts. */
export const useSync = create<SyncState>()(() => ({
  configured: isSyncConfigured(),
  ready: false,
  user: null,
  authError: null,
  phase: 'idle',
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  pending: 0,
  lastSyncedAt: null,
  error: null,
}));
