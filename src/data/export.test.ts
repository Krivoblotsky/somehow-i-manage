import { describe, expect, it } from 'vitest';
import type { Item, Person } from '../model/types';
import { personToMarkdown } from './export';

const person: Person = {
  id: 'p',
  name: 'Vira',
  role: 'PM',
  colorIndex: 0,
  contacts: [
    { kind: 'email', value: 'vira@x.com' },
    { kind: 'slack', value: 'vira' },
  ],
  sortOrder: 0,
  createdAt: 0,
  updatedAt: 0,
};
const items: Item[] = [
  {
    id: 'i1',
    personId: 'p',
    kind: 'task',
    title: 'Ship it',
    body: '<p>Soon</p>',
    isCompleted: false,
    isFlagged: true,
    sortOrder: 0,
    createdAt: 0,
    updatedAt: 0,
  },
];

describe('personToMarkdown', () => {
  it('lists contacts under the name and tasks as checkboxes', () => {
    const md = personToMarkdown(person, items);
    expect(md).toContain('# Vira');
    expect(md).toContain('- Email: vira@x.com');
    expect(md).toContain('- Slack: @vira');
    expect(md).toContain('- [ ] ⚑ Ship it');
    expect(md).toContain('  Soon');
  });
});
