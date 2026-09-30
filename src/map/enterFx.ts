/**
 * Entrance effects for things created while the page is open.
 * Items that already existed when the page loaded appear instantly; items created after that
 * (by this user, or later by sync) play their entrance exactly once.
 */

/** Wall-clock time this page loaded. */
export const SESSION_STARTED_AT = Date.now();

const played = new Set<string>();

/** Should the entrance for `key` play? True only for things created in this session, once. */
export function shouldPlayEnter(key: string, createdAt: number, startedAt = SESSION_STARTED_AT) {
  return createdAt > startedAt && !played.has(key);
}

export function markEnterPlayed(key: string) {
  played.add(key);
}

/** Test hook. */
export function resetEnterFx() {
  played.clear();
}
