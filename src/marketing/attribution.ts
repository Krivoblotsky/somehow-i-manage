/**
 * Where people come from, kept in the browser only. A campaign link (?utm_source=…) is
 * remembered on the first visit and attached to the first answer the signed-in user gives; the
 * two in-app questions remember that they were asked. Nothing here leaves the device by itself.
 */

const REFERRAL_KEY = 'personal.referral';
const FIRST_SEEN_KEY = 'personal.firstSeen';
const SOURCE_ASKED_KEY = 'personal.sourceAsked';
const SURVEY_DONE_KEY = 'personal.surveyDone';

export interface Referral {
  source: string;
  medium?: string;
  campaign?: string;
  /** A plain ?ref=… tag, for places where UTM parameters look odd. */
  ref?: string;
  landedAt: number;
}

const read = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // no storage: nothing is remembered, nothing breaks
  }
};

/** Remembers the first campaign link that brought this browser here, and cleans the address bar. */
export function captureReferral(now = Date.now()): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  const source = url.searchParams.get('utm_source') ?? url.searchParams.get('ref');
  if (!source) return;
  if (!read(REFERRAL_KEY)) {
    const referral: Referral = {
      source: source.trim().toLowerCase().slice(0, 60),
      medium: url.searchParams.get('utm_medium')?.slice(0, 60) ?? undefined,
      campaign: url.searchParams.get('utm_campaign')?.slice(0, 60) ?? undefined,
      ref: url.searchParams.get('ref')?.slice(0, 60) ?? undefined,
      landedAt: now,
    };
    write(REFERRAL_KEY, JSON.stringify(referral));
  }
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref'])
    url.searchParams.delete(key);
  window.history.replaceState(window.history.state, '', url.toString());
}

export function readReferral(): Referral | null {
  const raw = read(REFERRAL_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<Referral>;
    return typeof parsed.source === 'string' && typeof parsed.landedAt === 'number'
      ? (parsed as Referral)
      : null;
  } catch {
    return null;
  }
}

/** The first time the signed-in workspace opened on this device. Set on first call. */
export function firstSeenAt(now = Date.now()): number {
  const raw = read(FIRST_SEEN_KEY);
  const parsed = raw ? Number(raw) : NaN;
  if (Number.isFinite(parsed)) return parsed;
  write(FIRST_SEEN_KEY, String(now));
  return now;
}

export const sourceAsked = (): boolean => read(SOURCE_ASKED_KEY) === '1';
export const markSourceAsked = (): void => write(SOURCE_ASKED_KEY, '1');
export const surveyDone = (): boolean => read(SURVEY_DONE_KEY) === '1';
export const markSurveyDone = (): void => write(SURVEY_DONE_KEY, '1');

export const WEEK_MS = 7 * 86_400_000;
