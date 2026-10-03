import { describe, expect, it } from 'vitest';
import { QUOTES, pickQuote } from './quotes';

describe('quotes', () => {
  it('every quote has text and an author, and the picker covers the whole list', () => {
    for (const q of QUOTES) {
      expect(q.text.length).toBeGreaterThan(10);
      expect(q.by.length).toBeGreaterThan(2);
    }
    expect(pickQuote(() => 0)).toBe(QUOTES[0]);
    expect(pickQuote(() => 0.999)).toBe(QUOTES[QUOTES.length - 1]);
  });
});
