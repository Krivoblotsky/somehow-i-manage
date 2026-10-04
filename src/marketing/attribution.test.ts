import { beforeEach, describe, expect, it } from 'vitest';
import {
  captureReferral,
  firstSeenAt,
  markSourceAsked,
  readReferral,
  sourceAsked,
} from './attribution';

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, '', '/');
});

describe('campaign links', () => {
  it('remembers the first one, keeps it, and cleans the address bar', () => {
    window.history.replaceState(null, '', '/?utm_source=HN&utm_medium=post&utm_campaign=oct26&x=1');
    captureReferral(1000);
    expect(readReferral()).toEqual({
      source: 'hn',
      medium: 'post',
      campaign: 'oct26',
      ref: undefined,
      landedAt: 1000,
    });
    expect(window.location.search).toBe('?x=1');
    // a later link does not overwrite where the person first came from
    window.history.replaceState(null, '', '/?utm_source=reddit');
    captureReferral(2000);
    expect(readReferral()?.source).toBe('hn');
    expect(window.location.search).toBe('');
  });
  it('takes a plain ref tag too, and ignores URLs without one', () => {
    captureReferral();
    expect(readReferral()).toBeNull();
    window.history.replaceState(null, '', '/?ref=newsletter');
    captureReferral(5);
    expect(readReferral()).toMatchObject({ source: 'newsletter', ref: 'newsletter' });
  });
});

describe('first seen and asked flags', () => {
  it('sets first-seen once and remembers that the question was asked', () => {
    expect(firstSeenAt(100)).toBe(100);
    expect(firstSeenAt(999)).toBe(100);
    expect(sourceAsked()).toBe(false);
    markSourceAsked();
    expect(sourceAsked()).toBe(true);
  });
});
