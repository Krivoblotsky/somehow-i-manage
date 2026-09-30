import { describe, expect, it } from 'vitest';
import {
  CARD,
  PERSON_NODE,
  clusterRadius,
  itemRelativePosition,
  layoutClusters,
  ringLayout,
} from './layout';

describe('ringLayout', () => {
  it('returns one slot per item, evenly spaced on the first ring', () => {
    const slots = ringLayout(4);
    expect(slots).toHaveLength(4);
    expect(new Set(slots.map((s) => s.radius)).size).toBe(1);
    const step = slots[1].angle - slots[0].angle;
    expect(step).toBeCloseTo(Math.PI / 2);
  });

  it('widens the first ring so neighbouring cards do not overlap', () => {
    const slots = ringLayout(10);
    const chord = 2 * slots[0].radius * Math.sin(Math.PI / 10);
    expect(chord).toBeGreaterThan(CARD.width);
  });

  it('spills onto further rings with growing radii', () => {
    const slots = ringLayout(25);
    const radii = [...new Set(slots.map((s) => s.radius))];
    expect(radii.length).toBeGreaterThan(1);
    for (let i = 1; i < radii.length; i++) expect(radii[i]).toBeGreaterThan(radii[i - 1]);
  });

  it('never places two items at the same point', () => {
    const points = ringLayout(30).map(itemRelativePosition);
    const keys = new Set(points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`));
    expect(keys.size).toBe(30);
  });
});

describe('itemRelativePosition', () => {
  it('centres the card on the slot around the avatar centre', () => {
    const p = itemRelativePosition({ radius: 200, angle: 0 });
    expect(p.x + CARD.width / 2).toBeCloseTo(PERSON_NODE.avatarCenter.x + 200);
    expect(p.y + CARD.height / 2).toBeCloseTo(PERSON_NODE.avatarCenter.y);
  });
});

describe('layoutClusters', () => {
  it('keeps clusters apart, whatever their size', () => {
    const counts = [5, 0, 12, 1, 30, 3];
    const positions = layoutClusters(counts);
    expect(positions).toHaveLength(counts.length);
    const centres = positions.map((p) => ({
      x: p.x + PERSON_NODE.avatarCenter.x,
      y: p.y + PERSON_NODE.avatarCenter.y,
    }));
    for (let i = 0; i < counts.length; i++) {
      for (let j = i + 1; j < counts.length; j++) {
        const d = Math.hypot(centres[i].x - centres[j].x, centres[i].y - centres[j].y);
        expect(d).toBeGreaterThanOrEqual(clusterRadius(counts[i]) + clusterRadius(counts[j]));
      }
    }
  });

  it('uses a square-ish grid: three people become two columns', () => {
    const [a, b, c] = layoutClusters([5, 6, 0]);
    expect(a.y).toBeCloseTo(b.y);
    expect(c.y).toBeGreaterThan(a.y);
  });

  it('handles no people', () => {
    expect(layoutClusters([])).toEqual([]);
  });
});
