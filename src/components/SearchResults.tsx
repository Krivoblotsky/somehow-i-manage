import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../data/db';
import { stripHtml } from '../model/derive';
import { useUI } from '../state/ui';
import { Avatar } from './Avatar';
import styles from './SearchResults.module.css';

export function SearchResults({ query }: { query: string }) {
  const data = useLiveQuery(
    async () => ({
      people: await db.people.orderBy('sortOrder').toArray(),
      items: await db.items.toArray(),
    }),
    [],
  );
  const selectPerson = useUI((s) => s.selectPerson);
  const selectItem = useUI((s) => s.selectItem);
  const setSearch = useUI((s) => s.setSearch);

  if (!data) return null;
  const q = query.trim().toLowerCase();
  const peopleHits = data.people.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      (p.role ?? '').toLowerCase().includes(q) ||
      (p.contacts ?? []).some((c) => c.value.toLowerCase().includes(q)),
  );
  const itemHits = data.items.filter(
    (i) => i.title.toLowerCase().includes(q) || stripHtml(i.body).toLowerCase().includes(q),
  );
  const byId = new Map(data.people.map((p) => [p.id, p]));
  const total = peopleHits.length + itemHits.length;

  return (
    <div className={styles.results}>
      <div className={styles.summary}>
        {total} result{total === 1 ? '' : 's'} for “{query.trim()}”
      </div>

      {peopleHits.length > 0 && (
        <div className={styles.group}>
          <div className={styles.groupTitle}>People</div>
          {peopleHits.map((p) => (
            <button
              key={p.id}
              type="button"
              className={styles.hit}
              onClick={() => {
                setSearch('');
                selectPerson(p.id);
              }}
            >
              <Avatar person={p} size={32} />
              <span className={styles.hitTitle}>{p.name}</span>
              {p.role && <span className={styles.muted}>{p.role}</span>}
            </button>
          ))}
        </div>
      )}

      {itemHits.length > 0 && (
        <div className={styles.group}>
          <div className={styles.groupTitle}>Tasks &amp; notes</div>
          {itemHits.map((i) => {
            const owner = byId.get(i.personId);
            return (
              <button
                key={i.id}
                type="button"
                className={styles.hit}
                onClick={() => selectItem(i.id, i.personId)}
              >
                {owner && <Avatar person={owner} size={24} ring={2} />}
                <span className={styles.hitTitle}>{i.title || 'Untitled'}</span>
                <span className={styles.muted}>
                  {owner?.name} · {i.kind}
                  {i.kind === 'task' && i.isCompleted ? ' · completed' : ''}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
