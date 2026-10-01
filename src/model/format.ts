const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "13 May 2024 at 15:38" — the timestamp format used throughout the design. */
export function formatDateTime(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()} at ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "16:35" — a clock time, for "started at". */
export function formatTime(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "today", "yesterday", "12 days ago", "3 weeks ago", "2 months ago" — by calendar day. */
export function formatRelativeDays(ms: number, now: number): string {
  const startOfDay = (t: number) => {
    const d = new Date(t);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };
  const days = Math.round((startOfDay(now) - startOfDay(ms)) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.round(days / 7)} weeks ago`;
  return `${Math.round(days / 30)} months ago`;
}

/** "12 min", "1 h 05 min" — how long a 1:1 has been running. */
export function formatDuration(ms: number): string {
  const minutes = Math.max(0, Math.floor(ms / 60_000));
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')} min`;
}

/** "just now", "3 min ago", "2 h ago", then by day — for "last synced". */
export function formatRelativeTime(ms: number, now: number): string {
  const seconds = Math.max(0, Math.round((now - ms) / 1000));
  if (seconds < 45) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return formatRelativeDays(ms, now);
}

const SHORT_MONTHS = MONTHS;

/** "today", "yesterday", "Mon", then "10 Sep" (with the year once it differs) — for list rows. */
export function formatDayLabel(ms: number, now: number): string {
  const startOfDay = (t: number) => {
    const d = new Date(t);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };
  const days = Math.round((startOfDay(now) - startOfDay(ms)) / 86_400_000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  const d = new Date(ms);
  if (days > 1 && days < 7) return d.toLocaleDateString(undefined, { weekday: 'short' });
  const sameYear = d.getFullYear() === new Date(now).getFullYear();
  return `${d.getDate()} ${SHORT_MONTHS[d.getMonth()]}${sameYear ? '' : ` ${d.getFullYear()}`}`;
}

/** Local midnight of a calendar date, as ms — how due dates are stored. */
export function dateToMs(isoDate: string): number | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!m) return undefined;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime();
}

/** "2026-10-03" for a date input, from the stored ms. */
export function msToDateInput(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** How a due date reads on a card: "Due today", "Due tomorrow", "Due Fri", "Due 10 Oct", "3 days overdue". */
export function describeDue(dueMs: number, now: number): { label: string; overdue: boolean } {
  const startOfDay = (t: number) => {
    const d = new Date(t);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };
  const days = Math.round((startOfDay(dueMs) - startOfDay(now)) / 86_400_000);
  if (days < 0) {
    const n = -days;
    return { label: n === 1 ? 'Due yesterday' : `${n} days overdue`, overdue: true };
  }
  if (days === 0) return { label: 'Due today', overdue: false };
  if (days === 1) return { label: 'Due tomorrow', overdue: false };
  const d = new Date(dueMs);
  if (days < 7) {
    return {
      label: `Due ${d.toLocaleDateString(undefined, { weekday: 'short' })}`,
      overdue: false,
    };
  }
  return { label: `Due ${d.getDate()} ${SHORT_MONTHS[d.getMonth()]}`, overdue: false };
}
