import type { MapPosition } from '../model/types';

/** Geometry of a person node (see PersonNode.module.css — keep in sync). */
export const PERSON_NODE = {
  width: 120,
  height: 96,
  /** Centre of the avatar inside the node. */
  avatarCenter: { x: 60, y: 34 },
  /** Avatar radius plus gap plus ring: where edges start. */
  ringRadius: 34,
} as const;

/** Nominal card size used for layout; real height is measured after render. */
export const CARD = { width: 184, height: 64 } as const;

const FIRST_RING_MIN_RADIUS = 190;
const FIRST_RING_CAPACITY = 10;
const RING_GAP = 170;
const CLUSTER_GAP = 96;
const EMPTY_CLUSTER_RADIUS = 80;
const START_ANGLE = (-110 * Math.PI) / 180;

export interface RingSlot {
  radius: number;
  angle: number;
}

/** Evenly spaced slots on concentric rings around the avatar, first ring wide enough for the cards. */
export function ringLayout(count: number): RingSlot[] {
  const slots: RingSlot[] = [];
  let remaining = count;
  let ring = 0;
  let radius = 0;
  while (remaining > 0) {
    const capacity = FIRST_RING_CAPACITY + ring * 6;
    const inRing = Math.min(remaining, capacity);
    radius =
      ring === 0
        ? Math.max(FIRST_RING_MIN_RADIUS, (inRing * (CARD.width + 28)) / (2 * Math.PI))
        : radius + RING_GAP;
    const offset = ring % 2 === 1 ? Math.PI / inRing : 0;
    for (let j = 0; j < inRing; j++) {
      slots.push({ radius, angle: START_ANGLE + offset + (j * 2 * Math.PI) / inRing });
    }
    remaining -= inRing;
    ring++;
  }
  return slots;
}

/** Top-left of a card for a slot, relative to the owner's node. */
export function itemRelativePosition(slot: RingSlot): MapPosition {
  return {
    x: PERSON_NODE.avatarCenter.x + slot.radius * Math.cos(slot.angle) - CARD.width / 2,
    y: PERSON_NODE.avatarCenter.y + slot.radius * Math.sin(slot.angle) - CARD.height / 2,
  };
}

/** Radius of the circle that contains a person and all their cards. */
export function clusterRadius(itemCount: number): number {
  if (itemCount === 0) return EMPTY_CLUSTER_RADIUS;
  const slots = ringLayout(itemCount);
  const outer = slots[slots.length - 1].radius;
  return outer + Math.hypot(CARD.width, CARD.height) / 2 + 24;
}

/**
 * Automatic positions (top-left of each person node) for people in display order.
 * Clusters go into a grid of ceil(sqrt(n)) columns; every cell is as big as its cluster,
 * so nothing overlaps regardless of how many items a person has.
 */
export function layoutClusters(itemCounts: number[]): MapPosition[] {
  const n = itemCounts.length;
  if (n === 0) return [];
  const cols = Math.max(1, Math.ceil(Math.sqrt(n)));
  const radii = itemCounts.map(clusterRadius);
  const positions: MapPosition[] = [];
  let y = 0;
  for (let row = 0; row * cols < n; row++) {
    const rowRadii = radii.slice(row * cols, row * cols + cols);
    const rowHeight = Math.max(...rowRadii) * 2 + CLUSTER_GAP;
    let x = 0;
    for (const r of rowRadii) {
      const cellWidth = r * 2 + CLUSTER_GAP;
      const cx = x + cellWidth / 2;
      const cy = y + rowHeight / 2;
      positions.push({ x: cx - PERSON_NODE.avatarCenter.x, y: cy - PERSON_NODE.avatarCenter.y });
      x += cellWidth;
    }
    y += rowHeight;
  }
  return positions;
}

/** Centre of a card given its top-left, relative to the person node. */
function cardCenter(position: MapPosition) {
  return { x: position.x + CARD.width / 2, y: position.y + CARD.height / 2 };
}

function overlapsAny(candidate: MapPosition, existing: MapPosition[]): boolean {
  return existing.some(
    (e) =>
      Math.abs(e.x - candidate.x) < CARD.width + 16 &&
      Math.abs(e.y - candidate.y) < CARD.height + 24,
  );
}

/**
 * Where a new card goes so that nothing already placed has to move: the middle of the widest
 * angular gap around the hub, on the innermost ring where it does not overlap a neighbour.
 * The first card takes the balanced layout's first slot, the second lands opposite it, and so on.
 */
export function placeItem(existing: MapPosition[]): MapPosition {
  if (existing.length === 0) {
    return itemRelativePosition({ radius: FIRST_RING_MIN_RADIUS, angle: START_ANGLE });
  }
  const hub = PERSON_NODE.avatarCenter;
  const angles = existing
    .map(cardCenter)
    .map((c) => Math.atan2(c.y - hub.y, c.x - hub.x))
    .sort((a, b) => a - b);
  const gaps: { angle: number; size: number }[] = [];
  for (let i = 0; i < angles.length; i++) {
    const from = angles[i];
    const to = i + 1 < angles.length ? angles[i + 1] : angles[0] + 2 * Math.PI;
    gaps.push({ angle: from + (to - from) / 2, size: to - from });
  }
  gaps.sort((a, b) => b.size - a.size);
  for (let ring = 0; ring < 4; ring++) {
    const radius = FIRST_RING_MIN_RADIUS + ring * RING_GAP;
    for (const gap of gaps) {
      const candidate = itemRelativePosition({ radius, angle: gap.angle });
      if (!overlapsAny(candidate, existing)) return candidate;
    }
  }
  return itemRelativePosition({
    radius: FIRST_RING_MIN_RADIUS + 4 * RING_GAP,
    angle: gaps[0].angle,
  });
}

export interface PlacedCluster {
  position: MapPosition;
  itemCount: number;
}

/** Room reserved for a newcomer's future cards when choosing their spot. */
const NEWCOMER_ITEMS = 4;

/**
 * Where a new person goes without moving anyone: to the right of the rightmost cluster, on
 * that cluster's row, with room for a few cards of their own.
 */
export function placePerson(existing: PlacedCluster[]): MapPosition {
  if (existing.length === 0) return layoutClusters([0])[0];
  let rightEdge = -Infinity;
  let row = existing[0].position.y;
  for (const cluster of existing) {
    const edge = cluster.position.x + PERSON_NODE.avatarCenter.x + clusterRadius(cluster.itemCount);
    if (edge > rightEdge) {
      rightEdge = edge;
      row = cluster.position.y;
    }
  }
  const reserved = clusterRadius(NEWCOMER_ITEMS);
  return { x: rightEdge + CLUSTER_GAP + reserved - PERSON_NODE.avatarCenter.x, y: row };
}
