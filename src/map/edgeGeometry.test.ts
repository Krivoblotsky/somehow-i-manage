import { Position } from '@xyflow/react';
import { describe, expect, it } from 'vitest';
import { circlePoint, getEdgeParams, rectIntersection } from './edgeGeometry';

describe('circlePoint', () => {
  it('lies on the circle in the direction of the target', () => {
    const p = circlePoint({ cx: 0, cy: 0, r: 10 }, { x: 30, y: 40 });
    expect(Math.hypot(p.x, p.y)).toBeCloseTo(10);
    expect(p.x / p.y).toBeCloseTo(30 / 40);
  });
});

describe('rectIntersection', () => {
  const rect = { x: 100, y: 100, width: 200, height: 100 };

  it('hits the left edge for a point to the left', () => {
    const p = rectIntersection(rect, { x: -500, y: 150 });
    expect(p.x).toBeCloseTo(100);
    expect(p.y).toBeCloseTo(150);
  });

  it('hits the top edge for a point above', () => {
    const p = rectIntersection(rect, { x: 200, y: -500 });
    expect(p.y).toBeCloseTo(100);
    expect(p.x).toBeCloseTo(200);
  });

  it('returns the centre when the point is the centre', () => {
    expect(rectIntersection(rect, { x: 200, y: 150 })).toEqual({ x: 200, y: 150 });
  });
});

describe('getEdgeParams', () => {
  it('goes right/left for a card to the right of the avatar', () => {
    const params = getEdgeParams(
      { cx: 0, cy: 0, r: 34 },
      { x: 300, y: -30, width: 184, height: 60 },
    );
    expect(params.sx).toBeCloseTo(34);
    expect(params.sy).toBeCloseTo(0);
    expect(params.tx).toBeCloseTo(300);
    expect(params.sourcePosition).toBe(Position.Right);
    expect(params.targetPosition).toBe(Position.Left);
  });

  it('goes bottom/top for a card below the avatar', () => {
    const params = getEdgeParams(
      { cx: 0, cy: 0, r: 34 },
      { x: -92, y: 200, width: 184, height: 60 },
    );
    expect(params.sy).toBeCloseTo(34);
    expect(params.ty).toBeCloseTo(200);
    expect(params.sourcePosition).toBe(Position.Bottom);
    expect(params.targetPosition).toBe(Position.Top);
  });
});
