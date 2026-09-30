import { beforeEach, describe, expect, it } from 'vitest';
import { markEnterPlayed, resetEnterFx, shouldPlayEnter } from './enterFx';

beforeEach(resetEnterFx);

describe('shouldPlayEnter', () => {
  it('is false for things that existed before the page loaded', () => {
    expect(shouldPlayEnter('card:a', 999, 1000)).toBe(false);
    expect(shouldPlayEnter('card:a', 1000, 1000)).toBe(false);
  });

  it('is true once for things created after load, then false', () => {
    expect(shouldPlayEnter('card:a', 1001, 1000)).toBe(true);
    markEnterPlayed('card:a');
    expect(shouldPlayEnter('card:a', 1001, 1000)).toBe(false);
    expect(shouldPlayEnter('edge:a', 1001, 1000)).toBe(true);
  });
});
