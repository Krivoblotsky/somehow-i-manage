import { describe, expect, it } from 'vitest';
import { PERSON_NODE } from './layout';
import { MARKER_INSET, computeEdgeMarkers, toScreen } from './offscreen';

const size = { width: 1000, height: 600 };
const identity = { x: 0, y: 0, zoom: 1 };

describe('toScreen', () => {
  it('applies zoom then translation', () => {
    expect(toScreen({ x: 100, y: 50 }, { x: 10, y: 20, zoom: 2 })).toEqual({ x: 210, y: 120 });
  });
});

describe('computeEdgeMarkers', () => {
  it('ignores people inside the view, including ones half over the edge', () => {
    const people = [
      { id: 'in', center: { x: 500, y: 300 } },
      { id: 'edge', center: { x: 1000 + PERSON_NODE.ringRadius - 1, y: 300 } },
    ];
    expect(computeEdgeMarkers(people, identity, size)).toEqual([]);
  });

  it('pins a person far to the right on the right edge, pointing right', () => {
    const [m] = computeEdgeMarkers([{ id: 'a', center: { x: 3000, y: 300 } }], identity, size);
    expect(m.x).toBe(size.width - MARKER_INSET);
    expect(m.y).toBe(300);
    expect(m.angle).toBeCloseTo(0);
    expect(m.distance).toBeCloseTo(3000 - (size.width - MARKER_INSET));
  });

  it('pins a person below on the bottom edge, pointing down', () => {
    const [m] = computeEdgeMarkers([{ id: 'a', center: { x: 400, y: 2000 } }], identity, size);
    expect(m.x).toBe(400);
    expect(m.y).toBe(size.height - MARKER_INSET);
    expect(m.angle).toBeCloseTo(90);
  });

  it('pins a person up-left in the corner, pointing up-left', () => {
    const [m] = computeEdgeMarkers([{ id: 'a', center: { x: -500, y: -500 } }], identity, size);
    expect([m.x, m.y]).toEqual([MARKER_INSET, MARKER_INSET]);
    expect(m.angle).toBeCloseTo(-135);
  });

  it('honours the viewport transform', () => {
    // flow (100, 100) at zoom 0.5 with the view panned by (-2000, 0) lands far left of the screen
    const [m] = computeEdgeMarkers(
      [{ id: 'a', center: { x: 100, y: 100 } }],
      { x: -2000, y: 0, zoom: 0.5 },
      size,
    );
    expect(m.x).toBe(MARKER_INSET);
    expect(m.angle).toBeCloseTo(180);
  });

  it('returns nothing for containers too small to show a marker', () => {
    expect(
      computeEdgeMarkers([{ id: 'a', center: { x: 5000, y: 5000 } }], identity, {
        width: 40,
        height: 40,
      }),
    ).toEqual([]);
  });
});
