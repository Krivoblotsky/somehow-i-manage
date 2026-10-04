import { beforeEach, describe, expect, it } from 'vitest';
import { captureConsentRequest, clearConsent, pendingConsentId } from './consent';

beforeEach(() => {
  sessionStorage.clear();
  window.history.replaceState(null, '', '/');
});

describe('consent request capture', () => {
  it('keeps the authorization id and cleans the address bar', () => {
    window.history.replaceState(null, '', '/oauth/consent?authorization_id=abc123');
    captureConsentRequest();
    expect(pendingConsentId()).toBe('abc123');
    expect(window.location.pathname + window.location.search).toBe('/');
    clearConsent();
    expect(pendingConsentId()).toBeNull();
  });
  it('leaves other URLs alone', () => {
    window.history.replaceState(null, '', '/?code=supabase');
    captureConsentRequest();
    expect(pendingConsentId()).toBeNull();
    expect(window.location.search).toBe('?code=supabase');
  });
});
