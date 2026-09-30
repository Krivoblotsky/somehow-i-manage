import { describe, expect, it } from 'vitest';
import { findDropTarget } from './dropTarget';

const card = { x: 100, y: 100, width: 184, height: 64 };

describe('findDropTarget', () => {
  it('returns the person whose circle touches the card', () => {
    const target = findDropTarget(card, [{ id: 'a', circle: { cx: 300, cy: 132, r: 40 } }]);
    expect(target).toBe('a');
  });

  it('ignores circles that reach neither the card nor the pointer', () => {
    const far = [{ id: 'a', circle: { cx: 400, cy: 132, r: 40 } }];
    expect(findDropTarget(card, far)).toBeNull();
    expect(findDropTarget(card, far, undefined, { x: 200, y: 132 })).toBeNull();
  });

  it('never returns the current owner', () => {
    expect(
      findDropTarget(card, [{ id: 'owner', circle: { cx: 192, cy: 132, r: 40 } }], 'owner'),
    ).toBeNull();
  });

  it('prefers the circle nearest to the card centre', () => {
    const target = findDropTarget(card, [
      { id: 'far', circle: { cx: 90, cy: 132, r: 40 } },
      { id: 'near', circle: { cx: 200, cy: 150, r: 40 } },
    ]);
    expect(target).toBe('near');
  });

  it('accepts a pointer over a person even when the card itself is elsewhere', () => {
    const target = findDropTarget(
      card,
      [{ id: 'a', circle: { cx: 600, cy: 600, r: 40 } }],
      undefined,
      { x: 590, y: 610 },
    );
    expect(target).toBe('a');
  });

  it('lets the pointer decide when the card touches one person and the pointer another', () => {
    const target = findDropTarget(
      card,
      [
        { id: 'touched', circle: { cx: 300, cy: 132, r: 40 } },
        { id: 'pointed', circle: { cx: 600, cy: 600, r: 40 } },
      ],
      undefined,
      { x: 600, y: 600 },
    );
    expect(target).toBe('pointed');
  });
});
