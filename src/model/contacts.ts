import type { Contact, ContactKind } from './types';

export const CONTACT_KINDS: ContactKind[] = [
  'email',
  'phone',
  'slack',
  'telegram',
  'linkedin',
  'github',
  'x',
  'website',
];

export const CONTACT_LABEL: Record<ContactKind, string> = {
  email: 'Email',
  phone: 'Phone',
  slack: 'Slack',
  telegram: 'Telegram',
  linkedin: 'LinkedIn',
  github: 'GitHub',
  x: 'X',
  website: 'Website',
};

export const CONTACT_PLACEHOLDER: Record<ContactKind, string> = {
  email: 'vira@company.com',
  phone: '+380 67 000 00 00',
  slack: '@vira',
  telegram: '@vira',
  linkedin: 'linkedin.com/in/vira',
  github: 'vira',
  x: '@vira',
  website: 'https://vira.dev',
};

const HANDLE_KINDS = new Set<ContactKind>(['slack', 'telegram', 'github', 'x']);

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

function handle(value: string): string {
  return value.trim().replace(/^@/, '');
}

/** What to show: handles get their "@", everything else is shown as typed. */
export function contactDisplay(contact: Contact): string {
  const v = contact.value.trim();
  return HANDLE_KINDS.has(contact.kind) && !isUrl(v) ? `@${handle(v)}` : v;
}

/** Where a click goes; null means "copy to clipboard" (e.g. a bare Slack handle). */
export function contactHref(contact: Contact): string | null {
  const v = contact.value.trim();
  if (!v) return null;
  if (isUrl(v)) return v;
  switch (contact.kind) {
    case 'email':
      return `mailto:${v}`;
    case 'phone':
      return `tel:${v.replace(/[\s().-]/g, '')}`;
    case 'website':
      return `https://${v}`;
    case 'telegram':
      return `https://t.me/${handle(v)}`;
    case 'github':
      return `https://github.com/${handle(v)}`;
    case 'x':
      return `https://x.com/${handle(v)}`;
    case 'linkedin':
      return v.includes('/') ? `https://${v}` : `https://www.linkedin.com/in/${handle(v)}`;
    case 'slack':
      return null;
  }
}

export function isExternalHref(href: string): boolean {
  return /^https?:/i.test(href);
}

/** Trim, drop empties, one canonical order. */
export function normalizeContacts(contacts: Contact[]): Contact[] {
  const order = new Map(CONTACT_KINDS.map((k, i) => [k, i]));
  return contacts
    .map((c) => ({ kind: c.kind, value: c.value.trim() }))
    .filter((c) => c.value.length > 0)
    .sort((a, b) => (order.get(a.kind) ?? 0) - (order.get(b.kind) ?? 0));
}
