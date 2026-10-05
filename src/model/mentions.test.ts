import { describe, expect, it } from 'vitest';
import {
  filterItems,
  filterPeople,
  hasExactName,
  mentionedItems,
  mentionedPeople,
  nameFromHandle,
  previewSegments,
  previewText,
} from './mentions';
import type { Item, Person } from './types';

const person = (id: string, name: string, sortOrder = 0): Person => ({
  id,
  name,
  colorIndex: 0,
  sortOrder,
  createdAt: 0,
  updatedAt: 0,
});
const item = (id: string, title: string, extra: Partial<Item> = {}): Item => ({
  id,
  personId: 'p',
  kind: 'task',
  title,
  body: '',
  isCompleted: false,
  isFlagged: false,
  sortOrder: 0,
  createdAt: 0,
  updatedAt: 0,
  ...extra,
});

const body =
  '<ul><li><p>Check with <span data-type="personMention" data-id="p-vira" data-label="Vira" class="mention">@Vira</span></p></li>' +
  '<li><p>Pass the task to <span data-type="personMention" data-id="p-yana" data-label="Yana Vdovenko">@Yana Vdovenko</span></p></li></ul>' +
  '<p>Blocked by <span data-type="itemMention" data-id="i-trip" data-label="Business Trip">#Business Trip</span>?</p>';

describe('previews', () => {
  it('keeps mentions as links and separates blocks with a dot', () => {
    expect(previewSegments(body)).toEqual([
      { kind: 'text', text: 'Check with ' },
      { kind: 'person', id: 'p-vira', label: 'Vira' },
      { kind: 'text', text: ' · Pass the task to ' },
      { kind: 'person', id: 'p-yana', label: 'Yana Vdovenko' },
      { kind: 'text', text: ' · Blocked by ' },
      { kind: 'item', id: 'i-trip', label: 'Business Trip' },
      { kind: 'text', text: '?' },
    ]);
    expect(previewText(body)).toBe(
      'Check with @Vira · Pass the task to @Yana Vdovenko · Blocked by #Business Trip?',
    );
  });
  it('handles plain paragraphs, breaks and entities, and empty bodies', () => {
    expect(previewText('<p>One</p><p>Two<br>three &amp; four</p>')).toBe('One · Two three & four');
    expect(previewText('<p></p>')).toBe('');
    expect(previewSegments('')).toEqual([]);
  });
  it('lists who and what a body links to, once each', () => {
    expect(mentionedPeople(body + body)).toEqual(['p-vira', 'p-yana']);
    expect(mentionedItems(body)).toEqual(['i-trip']);
    expect(mentionedPeople('<p>no links</p>')).toEqual([]);
  });
});

describe('suggestions', () => {
  const people = [
    person('a', 'Anastasiia Sulzhyk', 0),
    person('b', 'Vira Kovalenko', 1),
    person('c', 'Yana Vdovenko', 2),
  ];
  it('matches names by word start, then anywhere', () => {
    expect(filterPeople(people, 'vi').map((p) => p.id)).toEqual(['b']);
    expect(filterPeople(people, 'yana.vdo').map((p) => p.id)).toEqual(['c']);
    expect(filterPeople(people, 'enko').map((p) => p.id)).toEqual(['b', 'c']);
    expect(filterPeople(people, '').map((p) => p.id)).toEqual(['a', 'b', 'c']);
    expect(filterPeople(people, 'zzz')).toEqual([]);
  });
  it('offers tasks and notes by title, open ones first, never the one being written or untitled ones', () => {
    const owner = people[1];
    const items = [
      { item: item('1', 'Business Trip', { updatedAt: 10 }), owner },
      { item: item('2', 'Trip report', { updatedAt: 30, isCompleted: true }), owner },
      { item: item('3', 'Release notes', { kind: 'note', updatedAt: 20 }), owner },
      { item: item('4', '', { updatedAt: 40 }), owner },
      { item: item('5', 'Trip insurance', { updatedAt: 50 }), owner },
    ];
    expect(filterItems(items, 'trip').map((c) => c.item.id)).toEqual(['5', '1', '2']);
    expect(filterItems(items, 'trip', '5').map((c) => c.item.id)).toEqual(['1', '2']);
    expect(filterItems(items, 'rel').map((c) => c.item.id)).toEqual(['3']);
    expect(filterItems(items, 'port').map((c) => c.item.id)).toEqual(['2']);
    expect(filterItems(items, '').map((c) => c.item.id)).toEqual(['5', '3', '1', '2']);
    expect(filterItems(items, 'zzz')).toEqual([]);
  });
  it('tells an exact name from a new one', () => {
    expect(hasExactName(['Yana Vdovenko'], 'yana.vdovenko')).toBe(true);
    expect(hasExactName(['Yana Vdovenko'], 'yana')).toBe(false);
  });
  it('turns a handle into a name', () => {
    expect(nameFromHandle('yana.vdovenko')).toBe('Yana Vdovenko');
    expect(nameFromHandle('@vira')).toBe('Vira');
  });
});
