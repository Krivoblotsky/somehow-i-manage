import type { Circle, Point, Rect } from './edgeGeometry';

export interface DropCandidate {
  id: string;
  circle: Circle;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

/**
 * Which person a dragged card is over. A hit is the pointer inside the person's circle (the
 * usual drag-and-drop feel) or, without a pointer, the card touching the circle. Pointer hits
 * win over card hits; ties go to the nearest centre. `excludeId` is the card's current owner.
 */
export function findDropTarget(
  card: Rect,
  candidates: DropCandidate[],
  excludeId?: string,
  pointer?: Point,
): string | null {
  const cardCenter = { x: card.x + card.width / 2, y: card.y + card.height / 2 };
  let best: { id: string; score: number } | null = null;
  for (const candidate of candidates) {
    if (candidate.id === excludeId) continue;
    const { cx, cy, r } = candidate.circle;
    const pointerHit = pointer ? Math.hypot(pointer.x - cx, pointer.y - cy) <= r : false;
    const nearestX = clamp(cx, card.x, card.x + card.width);
    const nearestY = clamp(cy, card.y, card.y + card.height);
    const cardHit = Math.hypot(nearestX - cx, nearestY - cy) <= r;
    if (!pointerHit && !cardHit) continue;
    const from = pointer ?? cardCenter;
    const distance = Math.hypot(from.x - cx, from.y - cy);
    const score = pointerHit ? distance : distance + 1_000_000;
    if (!best || score < best.score) best = { id: candidate.id, score };
  }
  return best?.id ?? null;
}
