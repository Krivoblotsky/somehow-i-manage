import { describe, expect, it } from 'vitest';
import {
  PROJECT_PALETTE,
  describeProjectCount,
  filterProjects,
  findProjectByName,
  normalizeProjectName,
  pickProjectColor,
  projectColor,
  projectCounts,
  sortProjectsByUse,
} from './projects';
import type { Item, Project } from './types';

const project = (id: string, name: string): Project => ({
  id,
  name,
  colorIndex: 0,
  sortOrder: 0,
  createdAt: 0,
  updatedAt: 0,
});
const item = (projectId: string | undefined, extra: Partial<Item> = {}): Item => ({
  id: crypto.randomUUID(),
  personId: 'p',
  kind: 'task',
  title: '',
  body: '',
  isCompleted: false,
  isFlagged: false,
  projectId,
  sortOrder: 0,
  createdAt: 0,
  updatedAt: 0,
  ...extra,
});

describe('project colours', () => {
  it('cycles the palette and hands out the least-used colour first', () => {
    expect(projectColor(0)).toBe(PROJECT_PALETTE[0]);
    expect(projectColor(PROJECT_PALETTE.length + 1)).toBe(PROJECT_PALETTE[1]);
    expect(pickProjectColor([])).toBe(0);
    expect(pickProjectColor([0, 1, 2])).toBe(3);
    expect(pickProjectColor([0, 0, 1, 2, 3, 4, 5, 6, 7])).toBe(1);
  });
});

describe('names', () => {
  it('normalises and matches regardless of case and spacing', () => {
    expect(normalizeProjectName('  Release   2.1 ')).toBe('Release 2.1');
    const projects = [project('a', 'MIPP'), project('b', 'Release 2.1')];
    expect(findProjectByName(projects, 'mipp')?.id).toBe('a');
    expect(findProjectByName(projects, ' release  2.1')?.id).toBe('b');
    expect(findProjectByName(projects, '')).toBeUndefined();
    expect(filterProjects(projects, 'rel').map((p) => p.id)).toEqual(['b']);
    expect(filterProjects(projects, '')).toHaveLength(2);
  });
});

describe('counts', () => {
  it('counts items and open tasks per project and sorts the busiest first', () => {
    const items = [
      item('a'),
      item('a', { isCompleted: true }),
      item('a', { kind: 'note' }),
      item('b'),
      item(undefined),
    ];
    const counts = projectCounts(items);
    expect(counts.get('a')).toEqual({ total: 3, open: 1 });
    expect(counts.get('b')).toEqual({ total: 1, open: 1 });
    expect(counts.has('c')).toBe(false);
    const projects = [project('c', 'Alpha'), project('b', 'Zed'), project('a', 'Mid')];
    expect(sortProjectsByUse(projects, counts).map((p) => p.id)).toEqual(['a', 'b', 'c']);
    expect(describeProjectCount(counts.get('a'))).toBe('3 items, 1 open');
    expect(describeProjectCount({ total: 1, open: 0 })).toBe('1 item');
    expect(describeProjectCount(undefined)).toBe('nothing yet');
  });
});
