import { describe, expect, it } from 'vitest';
import type { Item, Person } from '../model/types';
import { buildGraph } from './graph';

function person(partial: Partial<Person> & Pick<Person, 'id'>): Person {
  return { name: partial.id, colorIndex: 0, sortOrder: 0, createdAt: 0, updatedAt: 0, ...partial };
}
function item(partial: Partial<Item> & Pick<Item, 'id' | 'personId'>): Item {
  return {
    kind: 'task',
    title: partial.id,
    body: '',
    isCompleted: false,
    isFlagged: false,
    sortOrder: 0,
    createdAt: 0,
    updatedAt: 0,
    ...partial,
  };
}

const none = { itemId: null, personId: null, personPanelOpen: false };

describe('buildGraph', () => {
  it('makes a node per person and per item, and an edge per item', () => {
    const people = [person({ id: 'a', sortOrder: 1 }), person({ id: 'b', sortOrder: 0 })];
    const items = [
      item({ id: 'a1', personId: 'a' }),
      item({ id: 'a2', personId: 'a', sortOrder: 1 }),
      item({ id: 'b1', personId: 'b' }),
    ];
    const { nodes, edges } = buildGraph(people, items, none);
    expect(nodes.filter((n) => n.type === 'person').map((n) => n.id)).toEqual(['b', 'a']);
    expect(nodes.filter((n) => n.type === 'item')).toHaveLength(3);
    expect(edges.map((e) => [e.source, e.target])).toEqual([
      ['b', 'b1'],
      ['a', 'a1'],
      ['a', 'a2'],
    ]);
    const a1 = nodes.find((n) => n.id === 'a1');
    expect(a1?.parentId).toBe('a');
  });

  it('points each card back at its owner’s avatar', () => {
    const people = [person({ id: 'a' })];
    const items = [item({ id: 'a1', personId: 'a', mapPosition: { x: 200, y: 34 - 32 } })];
    const { nodes } = buildGraph(people, items, none);
    const card = nodes.find((n) => n.id === 'a1');
    expect(card?.type).toBe('item');
    if (card?.type === 'item') {
      // card centre at (292, 34) → avatar centre (60, 34) is 232 to the left
      expect(card.data.hubOffset).toEqual({ x: -232, y: 0 });
    }
  });

  it('prefers saved positions over the automatic layout', () => {
    const people = [person({ id: 'a', mapPosition: { x: 999, y: -5 } })];
    const items = [item({ id: 'a1', personId: 'a', mapPosition: { x: 1, y: 2 } })];
    const { nodes } = buildGraph(people, items, none);
    expect(nodes.find((n) => n.id === 'a')?.position).toEqual({ x: 999, y: -5 });
    expect(nodes.find((n) => n.id === 'a1')?.position).toEqual({ x: 1, y: 2 });
  });

  it('flags the selected item and the person whose panel is open', () => {
    const people = [person({ id: 'a' })];
    const items = [item({ id: 'a1', personId: 'a' }), item({ id: 'a2', personId: 'a' })];
    const { nodes } = buildGraph(people, items, {
      itemId: 'a2',
      personId: 'a',
      personPanelOpen: true,
    });
    expect(nodes.find((n) => n.id === 'a')?.data.isSelected).toBe(true);
    expect(nodes.find((n) => n.id === 'a1')?.data.isSelected).toBe(false);
    expect(nodes.find((n) => n.id === 'a2')?.data.isSelected).toBe(true);
  });

  it('ignores items whose person is missing', () => {
    const { nodes, edges } = buildGraph([], [item({ id: 'x', personId: 'ghost' })], none);
    expect(nodes).toEqual([]);
    expect(edges).toEqual([]);
  });
});
