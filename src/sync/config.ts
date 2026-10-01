const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';

/** Where to sync to. null = this build runs local-only and shows no sync UI. */
export const SYNC_CONFIG: { url: string; anonKey: string } | null =
  url !== '' && anonKey !== '' ? { url, anonKey } : null;

export const isSyncConfigured = (): boolean => SYNC_CONFIG !== null;
