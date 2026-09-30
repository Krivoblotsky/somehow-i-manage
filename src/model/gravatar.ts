import { fileToAvatarDataUrl } from './image';
import { sha256Hex } from './sha256';

/** Gravatar address for an email; `d=404` makes a missing avatar a 404 instead of a placeholder. */
export function gravatarUrl(email: string, size = 160): string {
  return `https://gravatar.com/avatar/${sha256Hex(email.trim().toLowerCase())}?s=${size}&d=404`;
}

function imageLoads(url: string, timeoutMs = 4000): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    const done = (ok: boolean) => {
      clearTimeout(timer);
      resolve(ok);
    };
    const timer = setTimeout(() => done(false), timeoutMs);
    img.onload = () => done(true);
    img.onerror = () => done(false);
    img.src = url;
  });
}

/**
 * The person's Gravatar, if they have one: as a small data URL when it can be fetched, the remote
 * URL when it exists but cannot be read cross-origin, null when there is none.
 */
export async function resolveGravatar(email: string): Promise<string | null> {
  const url = gravatarUrl(email);
  try {
    const response = await fetch(url);
    if (response.status === 404) return null;
    if (response.ok) return await fileToAvatarDataUrl(await response.blob());
  } catch {
    // network error or CORS: fall through to a plain image probe
  }
  return (await imageLoads(url)) ? url : null;
}
