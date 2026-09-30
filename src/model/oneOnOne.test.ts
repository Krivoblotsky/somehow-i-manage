import { describe, expect, it } from 'vitest';
import { buildMeetingView, isCoveredIn, lastMeeting, summarizeMeeting } from './oneOnOne';
import type { Item } from './types';

const MIN = 60_000;
const START = 1_000_000 * MIN; // this 1:1 started here
const PREV = {
  startedAt: START - 12 * 24 * 60 * MIN,
  endedAt: START - 12 * 24 * 60 * MIN + 30 * MIN,
};

let n = 0;
function item(over: Partial<Item>): Item {
  n++;
  return {
    id: `i${n}`,
    personId: 'p',
    kind: 'task',
    title: `Item ${n}`,
    body: '',
    isCompleted: false,
    isFlagged: false,
    sortOrder: n,
    createdAt: PREV.startedAt - 10 * MIN,
    updatedAt: PREV.startedAt - 10 * MIN,
    ...over,
  };
}

describe('lastMeeting', () => {
  it('picks the meeting that ended last, whatever the array order', () => {
    expect(lastMeeting({})).toBeUndefined();
    expect(
      lastMeeting({
        meetings: [
          { startedAt: 5, endedAt: 9 },
          { startedAt: 1, endedAt: 3 },
        ],
      }),
    ).toEqual({ startedAt: 5, endedAt: 9 });
  });
});

describe('buildMeetingView', () => {
  it('orders the agenda: urgent tasks, tasks, notes, then whatever is covered', () => {
    const covered = item({ title: 'Covered', discussedAt: START + MIN });
    const urgent = item({ title: 'Urgent', isFlagged: true });
    const plain = item({ title: 'Plain' });
    const note = item({ title: 'Note', kind: 'note' });
    const ticked = item({ title: 'Ticked now', isCompleted: true, completedAt: START + 2 * MIN });
    const view = buildMeetingView([covered, urgent, plain, note, ticked], START, PREV);
    expect(view.agenda.map((i) => i.title)).toEqual([
      'Urgent',
      'Plain',
      'Note',
      'Covered',
      'Ticked now',
    ]);
    expect(isCoveredIn(ticked, START)).toBe(true);
    expect(isCoveredIn(plain, START)).toBe(false);
  });

  it('keeps captured items out of the agenda and lists them newest first', () => {
    const a = item({ title: 'A', createdAt: START + MIN });
    const b = item({ title: 'B', createdAt: START + 2 * MIN });
    const old = item({ title: 'Old' });
    const view = buildMeetingView([a, old, b], START, PREV);
    expect(view.agenda.map((i) => i.title)).toEqual(['Old']);
    expect(view.addedNow.map((i) => i.title)).toEqual(['B', 'A']);
    expect(view.counts.added).toBe(2);
  });

  it('recaps what got done since the previous 1:1 and tags what is new', () => {
    const doneBefore = item({
      title: 'Done long ago',
      isCompleted: true,
      completedAt: PREV.startedAt - MIN,
    });
    const doneSince = item({
      title: 'Done since',
      isCompleted: true,
      completedAt: PREV.endedAt + MIN,
    });
    const doneNow = item({ title: 'Done now', isCompleted: true, completedAt: START + MIN });
    const fresh = item({ title: 'Fresh', createdAt: PREV.endedAt + 2 * MIN });
    const view = buildMeetingView([doneBefore, doneSince, doneNow, fresh], START, PREV);
    expect(view.doneSince.map((i) => i.title)).toEqual(['Done since']);
    expect(view.newSinceIds).toEqual(new Set([fresh.id]));
    expect(view.counts).toEqual({ discussed: 0, completed: 1, added: 0 });
  });

  it('treats a first 1:1 as "everything done so far", with no new tags', () => {
    const done = item({ title: 'Done', isCompleted: true, completedAt: START - MIN });
    const open = item({ title: 'Open' });
    const view = buildMeetingView([done, open], START);
    expect(view.doneSince.map((i) => i.title)).toEqual(['Done']);
    expect(view.newSinceIds.size).toBe(0);
  });
});

describe('summarizeMeeting', () => {
  it('lists only what happened', () => {
    expect(summarizeMeeting({ discussed: 2, completed: 1, added: 3 })).toBe(
      '2 discussed, 1 done, 3 added',
    );
    expect(summarizeMeeting({ discussed: 0, completed: 0, added: 1 })).toBe('1 added');
    expect(summarizeMeeting({ discussed: 0, completed: 0, added: 0 })).toBe('nothing recorded');
  });
});
