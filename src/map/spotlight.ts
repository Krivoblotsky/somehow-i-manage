import { mentionedItems, mentionedPeople } from '../model/mentions';
import type { Item } from '../model/types';

/**
 * How a card shows while a person or a project is in the spotlight: part of it, lit from
 * outside because its text mentions the spotlit person or the open task or note, or stepped
 * back. A spotlit project is satisfied only by its tag; the open item is always `in`. Nothing
 * spotlit: every card is `in`.
 */
export function cardSpotlight(
  item: Pick<Item, 'id' | 'personId' | 'projectId' | 'body'>,
  focusPersonId: string | null,
  focusProjectId: string | null,
  openItemId: string | null = null,
): 'in' | 'mentions' | 'out' {
  const outsidePerson = focusPersonId !== null && focusPersonId !== item.personId;
  const outsideProject = focusProjectId !== null && focusProjectId !== item.projectId;
  if (item.id === openItemId) return 'in'; // the one open in the panel, whoever is spotlit
  if (outsideProject) return 'out';
  if (!outsidePerson) return 'in';
  const mentions =
    mentionedPeople(item.body).includes(focusPersonId) ||
    (openItemId !== null &&
      openItemId !== item.id &&
      mentionedItems(item.body).includes(openItemId));
  return mentions ? 'mentions' : 'out';
}
