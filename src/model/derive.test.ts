import { describe, expect, it } from 'vitest';
import { describeStats, getInitials, groupItems, personStats, stripHtml } from './derive';
import { formatDateTime } from './format';
import { contrastText, personColor, pickColor } from './palette';
import type { Item } from './types';

function item(partial: Partial<Item>): Item {
  return {
    id: 'i',
    personId: 'p',
    kind: 'task',
    title: '',
    body: '',
    isCompleted: false,
    isFlagged: false,
    sortOrder: 0,
    createdAt: 0,
    updatedAt: 0,
    ...partial,
  };
}

describe('getInitials', () => {
  it('takes the first letter of the first two words', () => {
    expect(getInitials('Sergii Kryvoblotskyi')).toBe('SK');
    expect(getInitials('Vira')).toBe('V');
    expect(getInitials('  Anna   Maria  Kowalska ')).toBe('AM');
  });
  it('works for Cyrillic and emoji', () => {
    expect(getInitials('Анна Коваль')).toBe('АК');
    expect(getInitials('🦊 Fox')).toBe('🦊F');
  });
  it('falls back to a question mark', () => {
    expect(getInitials('   ')).toBe('?');
  });
});

describe('personStats / describeStats', () => {
  it('counts open, flagged, done and notes', () => {
    const stats = personStats([
      item({ isFlagged: true }),
      item({}),
      item({ isCompleted: true }),
      item({ kind: 'note' }),
      item({ kind: 'note', isCompleted: true }), // notes never count as tasks
    ]);
    expect(stats).toEqual({ openTasks: 2, completedTasks: 1, flagged: 1, notes: 2 });
    expect(describeStats(stats)).toBe('2 tasks, 1 urgent, 1 done, 2 notes');
  });
  it('uses singular forms and an empty-state phrase', () => {
    expect(describeStats(personStats([item({})]))).toBe('1 task');
    expect(describeStats(personStats([]))).toBe('Nothing yet');
  });
});

describe('stripHtml', () => {
  it('keeps a space between blocks and collapses whitespace', () => {
    expect(stripHtml('<p>Hello <b>world</b></p><p>Second&nbsp;line</p>')).toBe(
      'Hello world Second line',
    );
    expect(stripHtml('')).toBe('');
  });
});

describe('formatDateTime', () => {
  it('matches the design ("13 May 2024 at 15:38")', () => {
    expect(formatDateTime(new Date(2024, 4, 13, 15, 38).getTime())).toBe('13 May 2024 at 15:38');
    expect(formatDateTime(new Date(2026, 0, 1, 9, 5).getTime())).toBe('1 Jan 2026 at 09:05');
  });
});

describe('palette', () => {
  it('wraps indexes and picks readable text colours', () => {
    expect(personColor(6)).toBe(personColor(0));
    expect(personColor(-1)).toBe(personColor(5));
    expect(contrastText('#3C63EA')).toBe('#FFFFFF');
    expect(contrastText('#3DEBD6')).toBe('#111111');
  });
  it('picks the least-used colour, ties in palette order', () => {
    expect(pickColor([])).toBe(0);
    expect(pickColor([0, 1, 2])).toBe(3);
    expect(pickColor([0, 0, 1, 2, 3, 4, 5])).toBe(1);
  });
});

describe('groupItems', () => {
  it('splits into open (flagged first), notes (newest first) and completed (latest first)', () => {
    const grouped = groupItems([
      item({ id: 't1', sortOrder: 0 }),
      item({ id: 't2', sortOrder: 1, isFlagged: true }),
      item({ id: 'n1', kind: 'note', updatedAt: 1 }),
      item({ id: 'n2', kind: 'note', updatedAt: 2 }),
      item({ id: 'd1', isCompleted: true, completedAt: 5 }),
      item({ id: 'd2', isCompleted: true, completedAt: 9 }),
    ]);
    expect(grouped.openTasks.map((i) => i.id)).toEqual(['t2', 't1']);
    expect(grouped.notes.map((i) => i.id)).toEqual(['n2', 'n1']);
    expect(grouped.completed.map((i) => i.id)).toEqual(['d2', 'd1']);
  });
});
