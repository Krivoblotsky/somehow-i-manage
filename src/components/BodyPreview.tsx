import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, type MouseEvent } from 'react';
import { useDatabase } from '../data/DatabaseContext';
import { previewSegments } from '../model/mentions';
import { useUI } from '../state/ui';
import styles from './BodyPreview.module.css';

type Names = Map<string, string>;
const NO_NAMES: Names = new Map();

/**
 * A body on one or two lines: blocks joined with a dot, @people and #tasks-or-notes as small
 * links that open them. The links show current names and titles, not the ones typed back then;
 * one that points at something deleted falls back to plain text. Returns nothing for an empty
 * body. `nodrag nopan` keeps a click on a link from starting a drag of the card it sits on.
 */
export function BodyPreview({
  html,
  className,
  tone = 'light',
}: {
  html: string;
  className?: string;
  /** `light` on white cards and panels, `dark` on the canvas-coloured views. */
  tone?: 'light' | 'dark';
}) {
  const segments = useMemo(() => previewSegments(html), [html]);
  const database = useDatabase();
  const selectPerson = useUI((s) => s.selectPerson);
  const focusPerson = useUI((s) => s.focusPerson);
  const selectItem = useUI((s) => s.selectItem);
  const personIds = segments.flatMap((s) => (s.kind === 'person' ? [s.id] : []));
  const itemIds = segments.flatMap((s) => (s.kind === 'item' ? [s.id] : []));
  const key = [...personIds, ...itemIds].join(',');
  // What the links point at, as it is now: a Map from id to name/title, absent when gone.
  const names = useLiveQuery(
    async (): Promise<Names> => {
      if (!key) return NO_NAMES;
      const [people, items] = await Promise.all([
        database.people.bulkGet(personIds),
        database.items.bulkGet(itemIds),
      ]);
      const map: Names = new Map();
      for (const p of people) if (p) map.set(p.id, p.name);
      for (const i of items) if (i) map.set(i.id, i.title || 'Untitled');
      return map;
    },
    [database, key],
    undefined,
  );
  if (segments.length === 0) return null;
  const open = (e: MouseEvent, kind: 'person' | 'item', id: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (kind === 'person') {
      selectPerson(id);
      focusPerson(id);
    } else selectItem(id); // where we are stays where Back goes
  };
  return (
    <div className={[className, tone === 'dark' && styles.dark].filter(Boolean).join(' ')}>
      {segments.map((seg, i) => {
        if (seg.kind === 'text') return <span key={i}>{seg.text}</span>;
        const mark = seg.kind === 'person' ? '@' : '#';
        // not looked up yet: show what was typed; looked up and gone: plain text
        const current = names?.get(seg.id);
        if (names && current === undefined)
          return (
            <span key={i} className={styles.gone}>
              {mark}
              {seg.label}
            </span>
          );
        return (
          <button
            key={i}
            type="button"
            className={`nodrag nopan ${styles.link} ${seg.kind === 'person' ? styles.person : styles.item}`}
            onClick={(e) => open(e, seg.kind, seg.id)}
            onDoubleClick={(e) => e.stopPropagation()}
            title={seg.kind === 'person' ? 'Open person' : 'Open task or note'}
          >
            {mark}
            {current ?? seg.label}
          </button>
        );
      })}
    </div>
  );
}
