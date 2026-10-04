import type { Item, Person, Project } from '../model/types';

export type RecordKind = 'person' | 'item' | 'project';

/** One record as the server stores it: the whole object as JSON plus what sync needs. */
export interface SyncRow {
  id: string;
  kind: RecordKind;
  /** null for a tombstone. */
  data: Person | Item | Project | null;
  /** Version: when the device that made the change made it (ms). Last write wins. */
  updated_at: number;
  deleted_at: number | null;
  /** Server-side change counter; pulls ask for everything after the last one seen. */
  seq: number;
}

export type SyncChange = Omit<SyncRow, 'seq'>;

/** The wire: pull changes after a point, push local ones. Supabase in production, a fake in tests. */
export interface SyncTransport {
  pull(afterSeq: number, limit: number): Promise<SyncRow[]>;
  push(changes: SyncChange[]): Promise<void>;
}

export interface SyncUser {
  id: string;
  email?: string;
  /** From the Google profile, when present. */
  name?: string;
  avatarUrl?: string;
}

/** A passkey registered for the signed-in account (Face ID, Touch ID, a security key). */
export interface Passkey {
  id: string;
  /** What the authenticator calls itself, e.g. "iCloud Keychain"; absent for some keys. */
  name?: string;
  createdAt: number;
  lastUsedAt?: number;
}

/** An OAuth client (an AI assistant) asking to act as the user, as the consent screen shows it. */
export interface ConsentRequest {
  authorizationId: string;
  client: { id: string; name: string; uri?: string; logoUri?: string };
  /** Where the client is sent back to afterwards. */
  redirectUri: string;
  scope?: string;
}

/** A client the user approved before. Account & sync lists them and can disconnect one. */
export interface Grant {
  clientId: string;
  name: string;
  uri?: string;
  grantedAt: number;
}

/** Who is signed in and how to sign in: Supabase Auth in production, a fake in tests. */
export interface SyncAuth {
  getUser(): Promise<SyncUser | null>;
  onChange(listener: (user: SyncUser | null) => void): () => void;
  /** Sends the browser to Google; it comes back to the app signed in. */
  signInWithGoogle(): Promise<void>;
  /** The same round trip through Microsoft (work, school or personal accounts). */
  signInWithMicrosoft(): Promise<void>;
  /** The browser's passkey prompt; resolves once the session is set (no round trip). */
  signInWithPasskey(): Promise<void>;
  /** Registers a passkey for the signed-in account; the account must already exist. */
  registerPasskey(): Promise<Passkey>;
  listPasskeys(): Promise<Passkey[]>;
  deletePasskey(id: string): Promise<void>;
  signOut(): Promise<void>;
  /** Removes the account and everything in it on the server; the session ends with it. */
  deleteAccount(): Promise<void>;
  /**
   * OAuth 2.1 consent for AI assistants (MCP clients): who is asking, or the URL to go straight
   * back to when this client was approved before.
   */
  authorizationDetails(id: string): Promise<{ request: ConsentRequest } | { redirectUrl: string }>;
  /** Approve or deny; both give the URL that takes the user back to the client. */
  approveAuthorization(id: string): Promise<string>;
  denyAuthorization(id: string): Promise<string>;
  listGrants(): Promise<Grant[]>;
  revokeGrant(clientId: string): Promise<void>;
}

export type SyncPhase = 'idle' | 'syncing' | 'error';
