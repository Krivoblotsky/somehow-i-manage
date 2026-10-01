import { describe, expect, it } from 'vitest';
import {
  dateToMs,
  describeDue,
  formatDayLabel,
  formatDuration,
  formatRelativeDays,
  formatRelativeTime,
  formatTime,
  msToDateInput,
} from './format';

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

describe('formatRelativeTime', () => {
  it('goes from seconds to minutes to hours, then days', () => {
    const now = at(2026, 8, 30, 16, 0);
    expect(formatRelativeTime(now - 10_000, now)).toBe('just now');
    expect(formatRelativeTime(now - 3 * 60_000, now)).toBe('3 min ago');
    expect(formatRelativeTime(now - 2 * 3_600_000, now)).toBe('2 h ago');
    expect(formatRelativeTime(at(2026, 8, 28, 12), now)).toBe('2 days ago');
  });
});

describe('formatDayLabel / describeDue / date inputs', () => {
  const now = at(2026, 8, 30, 16, 0); // Wednesday
  it('labels days the way a list wants them', () => {
    expect(formatDayLabel(at(2026, 8, 30, 9), now)).toBe('today');
    expect(formatDayLabel(at(2026, 8, 29, 23), now)).toBe('yesterday');
    expect(formatDayLabel(at(2026, 8, 27), now)).toBe(
      new Date(2026, 8, 27).toLocaleDateString(undefined, { weekday: 'short' }),
    );
    expect(formatDayLabel(at(2026, 8, 10), now)).toBe('10 Sep');
    expect(formatDayLabel(at(2025, 11, 24), now)).toBe('24 Dec 2025');
  });
  it('describes due dates relative to today', () => {
    expect(describeDue(at(2026, 8, 30), now)).toEqual({ label: 'Due today', overdue: false });
    expect(describeDue(at(2026, 9, 1), now)).toEqual({ label: 'Due tomorrow', overdue: false });
    expect(describeDue(at(2026, 9, 10), now)).toEqual({ label: 'Due 10 Oct', overdue: false });
    expect(describeDue(at(2026, 8, 29), now)).toEqual({ label: 'Due yesterday', overdue: true });
    expect(describeDue(at(2026, 8, 27), now)).toEqual({ label: '3 days overdue', overdue: true });
  });
  it('round-trips a date input value through local midnight', () => {
    const ms = dateToMs('2026-10-03');
    expect(ms).toBe(at(2026, 9, 3));
    expect(msToDateInput(ms as number)).toBe('2026-10-03');
    expect(dateToMs('nope')).toBeUndefined();
  });
});
