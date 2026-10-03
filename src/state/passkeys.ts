import { useSyncExternalStore } from 'react';
import { passkeysSupported } from '../sync/passkeys';

const subscribe = () => () => {};

/**
 * Whether the browser can do passkeys: false on the server and during hydration (the pre-rendered
 * HTML has no browser), the real answer right after, with no mismatch in between.
 */
export function usePasskeysSupported(): boolean {
  return useSyncExternalStore(subscribe, passkeysSupported, () => false);
}
