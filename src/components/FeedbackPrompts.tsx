import { useLiveQuery } from 'dexie-react-hooks';
import { useState, type FormEvent } from 'react';
import { db } from '../data/db';
import {
  firstSeenAt,
  markSourceAsked,
  markSurveyDone,
  readReferral,
  sourceAsked,
  surveyDone,
  WEEK_MS,
} from '../marketing/attribution';
import { sendFeedback } from '../marketing/send';
import { useNow } from '../state/now';
import { useSync } from '../sync/store';
import styles from './FeedbackPrompts.module.css';
import ui from './ui.module.css';

const SOURCES = [
  ['hn', 'Hacker News'],
  ['producthunt', 'Product Hunt'],
  ['reddit', 'Reddit'],
  ['linkedin', 'LinkedIn'],
  ['google', 'Google'],
  ['friend', 'A friend'],
  ['other', 'Somewhere else'],
] as const;

/** At least this many people before the week-one questions: a tried app, not a glance. */
const SURVEY_MIN_PEOPLE = 3;

/**
 * Two small cards the app shows once each, bottom centre: "where did you hear about us?" on the
 * first sign-in (unless a campaign link already said), and two questions after a week of use.
 * Answers go to the maker's table in Supabase; nothing is asked twice.
 */
export function FeedbackPrompts() {
  const configured = useSync((s) => s.configured);
  const user = useSync((s) => s.user);
  const now = useNow();
  const peopleCount = useLiveQuery(() => db.people.count(), [], 0);
  const [, setTick] = useState(0);
  const bump = () => setTick((n) => n + 1);
  if (!configured || !user) return null;

  const firstSeen = firstSeenAt(now);
  if (!sourceAsked()) {
    const referral = readReferral();
    if (referral) {
      // the link already told us; record it without asking
      markSourceAsked();
      void sendFeedback({ kind: 'source', value: referral.source }).catch(() => undefined);
    } else {
      return <SourceAsk onDone={bump} />;
    }
  }
  if (!surveyDone() && now - firstSeen >= WEEK_MS && peopleCount >= SURVEY_MIN_PEOPLE)
    return <WeekOneSurvey onDone={bump} />;
  return null;
}

function SourceAsk({ onDone }: { onDone: () => void }) {
  const [sending, setSending] = useState<string | null>(null);
  async function pick(value: string | null) {
    markSourceAsked();
    if (value) {
      setSending(value);
      await sendFeedback({ kind: 'source', value }).catch(() => undefined);
    }
    onDone();
  }
  return (
    <aside className={styles.card} role="dialog" aria-label="One quick question">
      <div className={styles.head}>
        <strong>One quick question</strong>
        <span>Where did you hear about Somehow I Manage?</span>
      </div>
      <div className={styles.chips}>
        {SOURCES.map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={ui.chip}
            disabled={sending !== null}
            onClick={() => void pick(value)}
          >
            {sending === value ? '…' : label}
          </button>
        ))}
      </div>
      <button type="button" className={styles.skip} onClick={() => void pick(null)}>
        Skip
      </button>
    </aside>
  );
}

function WeekOneSurvey({ onDone }: { onDone: () => void }) {
  const [pay, setPay] = useState<'yes' | 'maybe' | 'no' | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!pay && !note.trim()) return;
    setBusy(true);
    markSurveyDone();
    await sendFeedback({ kind: 'survey', value: pay ?? '', note: note.trim() }).catch(
      () => undefined,
    );
    onDone();
  }
  function skip() {
    markSurveyDone();
    onDone();
  }
  return (
    <aside className={styles.card} role="dialog" aria-label="Two questions from the maker">
      <form onSubmit={(e) => void submit(e)}>
        <div className={styles.head}>
          <strong>Two questions from the maker</strong>
          <span>You have used this for a week. Would you pay for it?</span>
        </div>
        <div className={styles.chips} role="group" aria-label="Would you pay for this?">
          {(['yes', 'maybe', 'no'] as const).map((v) => (
            <button
              key={v}
              type="button"
              className={pay === v ? ui.chipPrimary : ui.chip}
              aria-pressed={pay === v}
              onClick={() => setPay(v)}
            >
              {v === 'yes' ? 'Yes' : v === 'maybe' ? 'Maybe' : 'No'}
            </button>
          ))}
        </div>
        <textarea
          className={styles.note}
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What is missing? One line is plenty."
          aria-label="What is missing?"
        />
        <div className={styles.row}>
          <button type="button" className={styles.skip} onClick={skip}>
            Not now
          </button>
          <button type="submit" className={ui.btnPrimary} disabled={busy || (!pay && !note.trim())}>
            {busy ? 'Sending…' : 'Send'}
          </button>
        </div>
      </form>
    </aside>
  );
}
