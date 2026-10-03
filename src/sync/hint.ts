/**
 * Whether this browser has signed in before. Read before the session check finishes, it decides
 * what to show meanwhile: the landing page for a newcomer (which is also what crawlers get,
 * pre-rendered into index.html), a quiet splash for someone coming back.
 */
const KEY = 'personal.signedIn';

export function readSignedInHint(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function writeSignedInHint(signedIn: boolean): void {
  try {
    localStorage.setItem(KEY, signedIn ? '1' : '0');
  } catch {
    // private mode or blocked storage: the hint is a nicety
  }
}
