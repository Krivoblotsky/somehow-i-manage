import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useToast } from './toast';

beforeEach(() => {
  vi.useFakeTimers();
  useToast.getState().dismiss();
});
afterEach(() => vi.useRealTimers());

describe('toast store', () => {
  it('shows a message and hides it after the duration', () => {
    useToast.getState().show('Deleted “x”', { durationMs: 1000 });
    expect(useToast.getState().toast?.message).toBe('Deleted “x”');
    vi.advanceTimersByTime(999);
    expect(useToast.getState().toast).not.toBeNull();
    vi.advanceTimersByTime(1);
    expect(useToast.getState().toast).toBeNull();
  });

  it('a newer toast replaces the older one and keeps its own timer', () => {
    useToast.getState().show('first', { durationMs: 1000 });
    vi.advanceTimersByTime(900);
    useToast.getState().show('second', { durationMs: 1000 });
    vi.advanceTimersByTime(500);
    expect(useToast.getState().toast?.message).toBe('second');
    vi.advanceTimersByTime(500);
    expect(useToast.getState().toast).toBeNull();
  });

  it('dismiss clears immediately', () => {
    useToast.getState().show('x');
    useToast.getState().dismiss();
    expect(useToast.getState().toast).toBeNull();
  });
});
