import { describe, expect, it } from 'vitest';
import { cardSpotlight } from './spotlight';

const mention = (id: string) =>
  `<span data-type="personMention" data-id="${id}" data-label="X">@X</span>`;
const link = (id: string) =>
  `<span data-type="itemMention" data-id="${id}" data-label="T">#T</span>`;
const card = (id: string, personId: string, body = '', projectId?: string) => ({
  id,
  personId,
  projectId,
  body,
});

describe('cardSpotlight', () => {
  it("lights the spotlit person's cards, and others' cards that mention them", () => {
    expect(cardSpotlight(card('a', 'vira'), 'vira', null)).toBe('in');
    expect(cardSpotlight(card('b', 'yana', `<p>Ask ${mention('vira')}</p>`), 'vira', null)).toBe(
      'mentions',
    );
    expect(cardSpotlight(card('c', 'yana'), 'vira', null)).toBe('out');
    expect(cardSpotlight(card('c', 'yana'), null, null)).toBe('in');
  });
  it("lights others' cards that link to the open task or note", () => {
    const about = card('b', 'yana', `<p>Depends on ${link('a')}</p>`);
    expect(cardSpotlight(about, 'vira', null, 'a')).toBe('mentions');
    expect(cardSpotlight(about, 'vira', null, 'z')).toBe('out');
    expect(cardSpotlight(about, 'vira', null)).toBe('out');
    // the open item itself stays lit even when the spotlight is on whoever we came from
    expect(cardSpotlight(about, 'vira', null, 'b')).toBe('in');
    expect(cardSpotlight(card('b', 'yana', '', 'other'), 'vira', 'mipp', 'b')).toBe('in');
  });
  it('a spotlit project is only satisfied by its tag', () => {
    expect(cardSpotlight(card('a', 'vira', '', 'mipp'), null, 'mipp')).toBe('in');
    expect(cardSpotlight(card('b', 'vira', '', 'hiring'), null, 'mipp')).toBe('out');
    // both spotlit: the tag is required, then the person's rule applies
    expect(cardSpotlight(card('c', 'yana', '', 'mipp'), 'vira', 'mipp')).toBe('out');
    expect(
      cardSpotlight(card('d', 'yana', `<p>${mention('vira')}</p>`, 'mipp'), 'vira', 'mipp'),
    ).toBe('mentions');
    expect(
      cardSpotlight(card('e', 'yana', `<p>${mention('vira')}</p>`, 'other'), 'vira', 'mipp'),
    ).toBe('out');
  });
});
