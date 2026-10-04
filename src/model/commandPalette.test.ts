import { describe, expect, it } from 'vitest';
import { buildResults } from './commandPalette';
import type { Item, Person } from './types';

const people: Person[] = [
  { id: 'v', name: 'Vira', role: 'PM', colorIndex: 0, sortOrder: 0, createdAt: 0, updatedAt: 0 },
  {
    id: 'n',
    name: 'Nata',
    colorIndex: 1,
    sortOrder: 1,
    createdAt: 0,
    updatedAt: 0,
    contacts: [{ kind: 'email', value: 'nata@x.com' }],
  },
];
const items: Item[] = [
  {
    id: 'i1',
    personId: 'v',
    kind: 'task',
    title: 'Salary review',
    body: '',
    isCompleted: false,
    isFlagged: false,
    sortOrder: 0,
    createdAt: 0,
    updatedAt: 5,
  },
  {
    id: 'i2',
    personId: 'n',
    kind: 'note',
    title: 'Retro',
    body: '<p>wants a raise review</p>',
    isCompleted: false,
    isFlagged: false,
    sortOrder: 0,
    createdAt: 0,
    updatedAt: 9,
  },
];

describe('buildResults', () => {
  it('lists people and view-appropriate commands for an empty query', () => {
    const r = buildResults('', people, items, 'map');
    expect(r.filter((x) => x.group === 'people').map((x) => x.label)).toEqual(['Vira', 'Nata']);
    expect(r.filter((x) => x.group === 'items')).toEqual([]);
    const commands = r.filter((x) => x.group === 'commands').map((x) => x.label);
    expect(commands).toContain('Switch to List view');
    expect(commands).not.toContain('Switch to Map view');
  });

  it('matches people by name, role and contacts; items by title and body', () => {
    expect(buildResults('pm', people, items, 'list').map((x) => x.label)).toContain('Vira');
    expect(buildResults('nata@x', people, items, 'list').map((x) => x.label)).toContain('Nata');
    const r = buildResults('review', people, items, 'list');
    const itemLabels = r.filter((x) => x.group === 'items').map((x) => x.label);
    expect(itemLabels).toEqual(['Salary review', 'Retro']); // title match ranks above body match
    expect(r.find((x) => x.label === 'Retro')?.hint).toBe('Nata · note');
  });

  it('offers to add a task or note with "Name: title"', () => {
    const r = buildResults('na: Prepare the deck', people, items, 'map');
    expect(r.slice(0, 2).map((x) => x.label)).toEqual([
      'Add task “Prepare the deck” with Nata',
      'Add note “Prepare the deck” about Nata',
    ]);
    expect(r[0].action).toEqual({
      type: 'add',
      personId: 'n',
      kind: 'task',
      title: 'Prepare the deck',
    });
  });

  it('filters commands by label or keyword', () => {
    const r = buildResults('json', people, items, 'map').filter((x) => x.group === 'commands');
    expect(r.map((x) => x.label).sort()).toEqual(['Back up to file', 'Restore from file']);
  });
});

describe('1:1 commands', () => {
  it('offers a 1:1 with whoever matched, and with everyone for a "1:1" query', () => {
    const labels = (q: string) => buildResults(q, people, items, 'list').map((r) => r.label);
    expect(labels('nat')).toContain('Start 1:1 with Nata');
    expect(labels('nat')).not.toContain('Start 1:1 with Vira');
    expect(labels('1:1')).toEqual(
      expect.arrayContaining(['Start 1:1 with Vira', 'Start 1:1 with Nata']),
    );
    expect(labels('')).not.toContain('Start 1:1 with Vira');
  });
  it('shows both view switches from the 1:1 screen', () => {
    const labels = buildResults('switch', people, items, 'meeting').map((r) => r.label);
    expect(labels).toEqual(expect.arrayContaining(['Switch to Map view', 'Switch to List view']));
  });

  it('finds projects by name, and lists them all for "projects"', () => {
    const projects = [
      { id: 'p1', name: 'MIPP', colorIndex: 0, sortOrder: 0, createdAt: 0, updatedAt: 0 },
      { id: 'p2', name: 'Hiring', colorIndex: 1, sortOrder: 1, createdAt: 0, updatedAt: 0 },
    ];
    const tagged = [{ ...items[0], projectId: 'p1' }, items[1]];
    const hits = buildResults('mi', people, tagged, 'map', projects).filter(
      (r) => r.group === 'projects',
    );
    expect(hits.map((r) => [r.label, r.hint])).toEqual([['MIPP', '1 item']]);
    expect(hits[0].action).toEqual({ type: 'project', projectId: 'p1' });
    const all = buildResults('projects', people, tagged, 'map', projects).filter(
      (r) => r.group === 'projects',
    );
    expect(all.map((r) => r.label)).toEqual(['Hiring', 'MIPP']);
    expect(all[0].hint).toBe('nothing yet');
    expect(
      buildResults('', people, tagged, 'map', projects).some((r) => r.group === 'projects'),
    ).toBe(false);
  });
});
