import { useLiveQuery } from 'dexie-react-hooks';
import { useDatabase } from '../data/DatabaseContext';
import { mentionedItems, mentionedPeople } from '../model/mentions';
import type { Item, Person } from '../model/types';

export interface MentionOf {
  item: Item;
  /** Whose task or note it is; missing only if they were deleted a moment ago. */
  owner: Person | undefined;
}
const NONE: MentionOf[] = [];

/** Other people's tasks and notes whose text @mentions this person, newest first, with whose they are. */
export function useMentionsOf(personId: string): MentionOf[] {
  const database = useDatabase();
  return useLiveQuery(
    async () => {
      const items = await database.items
        .filter((i) => i.personId !== personId && i.body.includes(personId))
        .toArray();
      const found = items
        .filter((i) => mentionedPeople(i.body).includes(personId))
        .sort((a, b) => b.updatedAt - a.updatedAt);
      return withOwners(found, database);
    },
    [database, personId],
    NONE,
  );
}

/** Tasks and notes whose text #links this item, newest first, with whose they are. */
export function useLinksTo(itemId: string): MentionOf[] {
  const database = useDatabase();
  return useLiveQuery(
    async () => {
      const items = await database.items
        .filter((i) => i.id !== itemId && i.body.includes(itemId))
        .toArray();
      const found = items
        .filter((i) => mentionedItems(i.body).includes(itemId))
        .sort((a, b) => b.updatedAt - a.updatedAt);
      return withOwners(found, database);
    },
    [database, itemId],
    NONE,
  );
}

async function withOwners(
  found: Item[],
  database: ReturnType<typeof useDatabase>,
): Promise<MentionOf[]> {
  const owners = await database.people.bulkGet([...new Set(found.map((i) => i.personId))]);
  const byId = new Map(owners.map((p) => [p?.id, p]));
  return found.map((item) => ({ item, owner: byId.get(item.personId) }));
}
