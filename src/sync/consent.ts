const KEY = 'personal.oauthConsent';

/**
 * Supabase's OAuth server sends the user to this app with ?authorization_id=… when an AI
 * assistant asks to connect. Keep the id for the consent screen and clean the address bar: the
 * sign-in that may have to happen first comes back to the plain app URL, and the id survives it.
 */
export function captureConsentRequest(): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  const id = url.searchParams.get('authorization_id');
  if (!id) return;
  try {
    sessionStorage.setItem(KEY, id);
  } catch {
    return; // no storage: leave the URL alone, nothing else can carry the id
  }
  window.history.replaceState(window.history.state, '', import.meta.env.BASE_URL);
}

/** The request waiting for the user's decision, if any. */
export function pendingConsentId(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function clearConsent(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // nothing to clear
  }
}
