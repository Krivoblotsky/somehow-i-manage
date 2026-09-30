import type { Edge, Node } from '@xyflow/react';
import { personColor } from '../model/palette';
import type { Item, Person } from '../model/types';
import { CARD, PERSON_NODE, itemRelativePosition, layoutClusters, ringLayout } from './layout';

export type PersonNodeData = {
  person: Person;
  itemCount: number;
  color: string;
  isSelected: boolean;
  /** Transient: a card is being dragged over this person. Set through updateNodeData. */
  isDropTarget?: boolean;
};

export type ItemNodeData = {
  item: Item;
  color: string;
  isSelected: boolean;
  /** Vector from the card's centre to the owner's avatar centre — where a new card grows from. */
  hubOffset: { x: number; y: number };
};

export type PersonNodeType = Node<PersonNodeData, 'person'>;
export type ItemNodeType = Node<ItemNodeData, 'item'>;
export type MapNode = PersonNodeType | ItemNodeType;

export type FloatingEdgeData = {
  color: string;
  /** When the target item was created; drives the draw-in effect for new branches. */
  createdAt: number;
};
export type FloatingEdgeType = Edge<FloatingEdgeData, 'floating'>;

export interface MapSelection {
  itemId: string | null;
  personId: string | null;
  personPanelOpen: boolean;
}

export interface Graph {
  nodes: MapNode[];
  edges: FloatingEdgeType[];
}

/**
 * People become parent nodes, their items child nodes (positions relative to the parent, so
 * dragging a person carries the cards along), one floating edge per item.
 * Saved positions win over the automatic layout.
 */
export function buildGraph(people: Person[], items: Item[], selection: MapSelection): Graph {
  const sortedPeople = [...people].sort((a, b) => a.sortOrder - b.sortOrder);
  const itemsByPerson = new Map<string, Item[]>();
  for (const person of sortedPeople) itemsByPerson.set(person.id, []);
  for (const item of items) itemsByPerson.get(item.personId)?.push(item);
  for (const list of itemsByPerson.values()) list.sort((a, b) => a.sortOrder - b.sortOrder);

  const autoPositions = layoutClusters(
    sortedPeople.map((p) => itemsByPerson.get(p.id)?.length ?? 0),
  );

  const nodes: MapNode[] = [];
  const edges: FloatingEdgeType[] = [];

  sortedPeople.forEach((person, index) => {
    const personItems = itemsByPerson.get(person.id) ?? [];
    const color = personColor(person.colorIndex);
    nodes.push({
      id: person.id,
      type: 'person',
      position: person.mapPosition ?? autoPositions[index],
      data: {
        person,
        itemCount: personItems.length,
        color,
        isSelected: selection.personPanelOpen && selection.personId === person.id,
      },
      zIndex: 1,
    });

    const slots = ringLayout(personItems.length);
    personItems.forEach((item, j) => {
      const position = item.mapPosition ?? itemRelativePosition(slots[j]);
      nodes.push({
        id: item.id,
        type: 'item',
        parentId: person.id,
        position,
        data: {
          item,
          color,
          isSelected: selection.itemId === item.id,
          hubOffset: {
            x: PERSON_NODE.avatarCenter.x - (position.x + CARD.width / 2),
            y: PERSON_NODE.avatarCenter.y - (position.y + CARD.height / 2),
          },
        },
        zIndex: 2,
      });
      edges.push({
        id: `e-${item.id}`,
        source: person.id,
        target: item.id,
        type: 'floating',
        data: { color, createdAt: item.createdAt },
        focusable: false,
        selectable: false,
      });
    });
  });

  return { nodes, edges };
}
