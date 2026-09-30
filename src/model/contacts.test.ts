import { describe, expect, it } from 'vitest';
import { contactDisplay, contactHref, isEmail, normalizeContacts } from './contacts';

describe('contactHref', () => {
  it('builds mailto and tel links', () => {
    expect(contactHref({ kind: 'email', value: ' vira@x.com ' })).toBe('mailto:vira@x.com');
    expect(contactHref({ kind: 'phone', value: '+380 (67) 123-45-67' })).toBe('tel:+380671234567');
  });

  it('turns handles into profile URLs and leaves full URLs alone', () => {
    expect(contactHref({ kind: 'telegram', value: '@vira' })).toBe('https://t.me/vira');
    expect(contactHref({ kind: 'github', value: 'vira' })).toBe('https://github.com/vira');
    expect(contactHref({ kind: 'x', value: '@vira' })).toBe('https://x.com/vira');
    expect(contactHref({ kind: 'linkedin', value: 'vira' })).toBe(
      'https://www.linkedin.com/in/vira',
    );
    expect(contactHref({ kind: 'linkedin', value: 'linkedin.com/in/vira' })).toBe(
      'https://linkedin.com/in/vira',
    );
    expect(contactHref({ kind: 'website', value: 'vira.dev' })).toBe('https://vira.dev');
    expect(contactHref({ kind: 'website', value: 'http://vira.dev/x' })).toBe('http://vira.dev/x');
  });

  it('has no link for a bare Slack handle, but keeps a Slack URL', () => {
    expect(contactHref({ kind: 'slack', value: '@vira' })).toBeNull();
    expect(contactHref({ kind: 'slack', value: 'https://acme.slack.com/team/U1' })).toBe(
      'https://acme.slack.com/team/U1',
    );
    expect(contactHref({ kind: 'slack', value: '   ' })).toBeNull();
  });
});

describe('contactDisplay', () => {
  it('shows handles with one @ and other values verbatim', () => {
    expect(contactDisplay({ kind: 'slack', value: 'vira' })).toBe('@vira');
    expect(contactDisplay({ kind: 'slack', value: '@vira' })).toBe('@vira');
    expect(contactDisplay({ kind: 'email', value: 'vira@x.com' })).toBe('vira@x.com');
  });
});

describe('normalizeContacts / isEmail', () => {
  it('trims, drops empties and orders canonically', () => {
    expect(
      normalizeContacts([
        { kind: 'x', value: ' @v ' },
        { kind: 'phone', value: '   ' },
        { kind: 'email', value: 'v@x.com' },
      ]),
    ).toEqual([
      { kind: 'email', value: 'v@x.com' },
      { kind: 'x', value: '@v' },
    ]);
  });
  it('recognises emails loosely', () => {
    expect(isEmail('vira@company.com')).toBe(true);
    expect(isEmail('vira@company')).toBe(false);
    expect(isEmail('not an email')).toBe(false);
  });
});
