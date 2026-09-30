import type { Item, Meeting, Person } from './types';

/** The most recent finished 1:1 with this person, if any. */
export function lastMeeting(person: Pick<Person, 'meetings'>): Meeting | undefined {
  let last: Meeting | undefined;
  for (const m of person.meetings ?? []) if (!last || m.endedAt > last.endedAt) last = m;
  return last;
}

/** Covered in the running 1:1: marked as discussed, or completed, since it started. */
export function isCoveredIn(item: Item, startedAt: number): boolean {
  return (
    (item.discussedAt !== undefined && item.discussedAt >= startedAt) ||
    (item.isCompleted && (item.completedAt ?? 0) >= startedAt)
  );
}

export interface MeetingCounts {
  discussed: number;
  completed: number;
  added: number;
}

export interface MeetingView {
  /**
   * What to go through: open tasks (urgent first), then notes. Whatever is already covered
   * sinks to the bottom; tasks ticked during this 1:1 stay in place, greyed, so nothing jumps.
   */
  agenda: Item[];
  /** Agenda items that appeared since the previous 1:1. Empty for a first 1:1. */
  newSinceIds: Set<string>;
  /** Captured while this 1:1 runs, newest first. Shown next to the capture box, not in the agenda. */
  addedNow: Item[];
  /** Tasks completed after the previous 1:1 and before this one started, newest first. */
  doneSince: Item[];
  counts: MeetingCounts;
}

/** Everything the 1:1 screen shows, derived from the person's items. Pure. */
export function buildMeetingView(
  items: Item[],
  startedAt: number,
  previous?: Meeting,
): MeetingView {
  const since = previous?.endedAt ?? 0;
  const completedAt = (i: Item) => i.completedAt ?? 0;

  const addedNow = items
    .filter((i) => i.createdAt >= startedAt)
    .sort((a, b) => b.createdAt - a.createdAt);

  const agenda = items
    .filter(
      (i) =>
        i.createdAt < startedAt &&
        (i.kind === 'note' || !i.isCompleted || completedAt(i) >= startedAt),
    )
    .sort(
      (a, b) =>
        Number(isCoveredIn(a, startedAt)) - Number(isCoveredIn(b, startedAt)) ||
        Number(a.kind === 'note') - Number(b.kind === 'note') ||
        Number(b.isFlagged) - Number(a.isFlagged) ||
        a.sortOrder - b.sortOrder,
    );

  const newSinceIds = new Set(
    previous ? agenda.filter((i) => i.createdAt >= since).map((i) => i.id) : [],
  );

  const doneSince = items
    .filter(
      (i) =>
        i.kind === 'task' && i.isCompleted && completedAt(i) >= since && completedAt(i) < startedAt,
    )
    .sort((a, b) => completedAt(b) - completedAt(a));

  const counts: MeetingCounts = {
    discussed: items.filter((i) => i.discussedAt !== undefined && i.discussedAt >= startedAt)
      .length,
    completed: items.filter((i) => i.isCompleted && completedAt(i) >= startedAt).length,
    added: addedNow.length,
  };

  return { agenda, newSinceIds, addedNow, doneSince, counts };
}

/** "2 discussed, 1 done, 3 added" — the line in the toast when a 1:1 ends. */
export function summarizeMeeting(counts: MeetingCounts): string {
  const parts: string[] = [];
  if (counts.discussed > 0) parts.push(`${counts.discussed} discussed`);
  if (counts.completed > 0) parts.push(`${counts.completed} done`);
  if (counts.added > 0) parts.push(`${counts.added} added`);
  return parts.length > 0 ? parts.join(', ') : 'nothing recorded';
}
