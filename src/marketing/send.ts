import { isSyncConfigured } from '../sync/config';
import { getSupabase } from '../sync/supabase';
import { readReferral, type Referral } from './attribution';

export interface FeedbackEntry {
  kind: 'source' | 'survey';
  value: string;
  note?: string;
}

/** The wire for the two write-only tables in supabase/schema.sql; a fake in tests. */
export interface MarketingTransport {
  sendFeedback(entry: FeedbackEntry & { referral: Referral | null }): Promise<void>;
  countPageView(view: {
    path: string;
    source: string | null;
    campaign: string | null;
  }): Promise<void>;
}

async function supabaseTransport(): Promise<MarketingTransport> {
  const client = await getSupabase();
  return {
    async sendFeedback(entry) {
      const { error } = await client.from('feedback').insert({
        kind: entry.kind,
        value: entry.value,
        note: entry.note ?? '',
        referral: entry.referral,
      });
      if (error) throw new Error(error.message);
    },
    async countPageView(view) {
      const { error } = await client.from('page_views').insert(view);
      if (error) throw new Error(error.message);
    },
  };
}

let transport: (() => Promise<MarketingTransport>) | null = null;

/** Tests: swap the server for a fake. */
export function configureMarketing(fake: MarketingTransport | null): void {
  transport = fake ? () => Promise.resolve(fake) : null;
}

const wire = (): Promise<MarketingTransport> => (transport ?? supabaseTransport)();

/** An answer from the signed-in user, with the campaign link that brought them, if any. */
export async function sendFeedback(entry: FeedbackEntry): Promise<void> {
  if (!transport && !isSyncConfigured()) return;
  await (await wire()).sendFeedback({ ...entry, referral: readReferral() });
}

/**
 * One row per landing-page visit: path, campaign tag, day. Nothing about the visitor. Fails
 * silently: counting is never worth an error in someone's face.
 */
export async function countPageView(path: string): Promise<void> {
  if (!transport && !isSyncConfigured()) return;
  const referral = readReferral();
  try {
    await (
      await wire()
    ).countPageView({
      path,
      source: referral?.source ?? null,
      campaign: referral?.campaign ?? null,
    });
  } catch {
    // offline, blocked, or the table is not there yet
  }
}
