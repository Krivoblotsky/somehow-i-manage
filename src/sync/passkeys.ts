/** Whether this browser can do WebAuthn at all (every current Safari, Chrome, Edge, Firefox). */
export function passkeysSupported(): boolean {
  return typeof window !== 'undefined' && 'PublicKeyCredential' in window;
}

/** The browser's WebAuthn errors read like stack traces; say what happened instead. */
export function describePasskeyError(error: { name?: string; message: string }): string {
  const text = `${error.name ?? ''} ${error.message}`;
  if (/NotAllowedError|not allowed|timed out|cancel/i.test(text))
    return 'No passkey was used — the prompt was closed or timed out.';
  if (/NotSupportedError|not supported|SecurityError/i.test(text))
    return 'This browser or device cannot use passkeys here.';
  if (/InvalidStateError|already registered/i.test(text))
    return 'This device already has a passkey for this account.';
  return error.message;
}
