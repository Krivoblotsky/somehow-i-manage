/** Where feedback goes: one inbox, read by the person who builds this. */
export const FEEDBACK_EMAIL = 'hello@somehowimanage.app';

/** A mail link with the subject set and the text filled in, so sending is one click. */
export function feedbackMailto(text = ''): string {
  const subject = 'Feedback on Somehow I Manage';
  const trimmed = text.trim();
  const params = new URLSearchParams({ subject });
  if (trimmed) params.set('body', trimmed);
  // URLSearchParams encodes spaces as "+", which mail clients show literally
  return `mailto:${FEEDBACK_EMAIL}?${params.toString().replace(/\+/g, '%20')}`;
}
