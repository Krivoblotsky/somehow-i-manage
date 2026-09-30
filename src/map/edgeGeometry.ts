import { Position } from '@xyflow/react';

export interface Circle {
  cx: number;
  cy: number;
  r: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface EdgeParams {
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  sourcePosition: Position;
  targetPosition: Position;
}

/** Point on the circle facing `toward`. */
export function circlePoint(circle: Circle, toward: Point): Point {
  const dx = toward.x - circle.cx;
  const dy = toward.y - circle.cy;
  const len = Math.hypot(dx, dy) || 1;
  return { x: circle.cx + (dx / len) * circle.r, y: circle.cy + (dy / len) * circle.r };
}

/** Where the segment from the rect's centre to `toward` leaves the rect. */
export function rectIntersection(rect: Rect, toward: Point): Point {
  const w = rect.width / 2;
  const h = rect.height / 2;
  const cx = rect.x + w;
  const cy = rect.y + h;
  const xx1 = (toward.x - cx) / (2 * w) - (toward.y - cy) / (2 * h);
  const yy1 = (toward.x - cx) / (2 * w) + (toward.y - cy) / (2 * h);
  const denominator = Math.abs(xx1) + Math.abs(yy1);
  if (denominator === 0) return { x: cx, y: cy };
  const a = 1 / denominator;
  const xx3 = a * xx1;
  const yy3 = a * yy1;
  return { x: w * (xx3 + yy3) + cx, y: h * (-xx3 + yy3) + cy };
}

/** Endpoints and bezier directions for an edge from a person (circle) to a card (rect). */
export function getEdgeParams(source: Circle, target: Rect): EdgeParams {
  const targetCenter = { x: target.x + target.width / 2, y: target.y + target.height / 2 };
  const s = circlePoint(source, targetCenter);
  const t = rectIntersection(target, { x: source.cx, y: source.cy });
  const dx = targetCenter.x - source.cx;
  const dy = targetCenter.y - source.cy;
  const horizontal = Math.abs(dx) > Math.abs(dy);
  const sourcePosition = horizontal
    ? dx > 0
      ? Position.Right
      : Position.Left
    : dy > 0
      ? Position.Bottom
      : Position.Top;
  const targetPosition = horizontal
    ? dx > 0
      ? Position.Left
      : Position.Right
    : dy > 0
      ? Position.Top
      : Position.Bottom;
  return { sx: s.x, sy: s.y, tx: t.x, ty: t.y, sourcePosition, targetPosition };
}
