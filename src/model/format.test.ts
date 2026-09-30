import { describe, expect, it } from 'vitest';
import { formatDuration, formatRelativeDays, formatTime } from './format';

const at = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m, d, h, min).getTime();

describe('formatRelativeDays', () => {
  const now = at(2026, 8, 30, 16, 0);
  it('counts calendar days, not 24-hour blocks', () => {
    expect(formatRelativeDays(at(2026, 8, 30, 1, 0), now)).toBe('today');
    expect(formatRelativeDays(at(2026, 8, 29, 23, 30), now)).toBe('yesterday');
    expect(formatRelativeDays(at(2026, 8, 18, 16, 35), now)).toBe('12 days ago');
  });
  it('rounds to weeks and months further back', () => {
    expect(formatRelativeDays(at(2026, 8, 10), now)).toBe('3 weeks ago');
    expect(formatRelativeDays(at(2026, 6, 22), now)).toBe('2 months ago');
  });
});

describe('formatDuration / formatTime', () => {
  it('shows minutes, then hours and minutes', () => {
    expect(formatDuration(0)).toBe('0 min');
    expect(formatDuration(12.5 * 60_000)).toBe('12 min');
    expect(formatDuration(65 * 60_000)).toBe('1 h 05 min');
  });
  it('formats a clock time', () => {
    expect(formatTime(at(2026, 8, 30, 16, 5))).toBe('16:05');
  });
});
