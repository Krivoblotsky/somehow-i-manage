import { useNodes, useStore, useViewport } from '@xyflow/react';
import type { CSSProperties } from 'react';
import type { MapNode, PersonNodeType } from '../../map/graph';
import { PERSON_NODE } from '../../map/layout';
import { computeEdgeMarkers } from '../../map/offscreen';
import { personColor } from '../../model/palette';
import { Avatar } from '../Avatar';
import styles from './OffscreenMarkers.module.css';
import { selectFocusPersonId, useUI } from '../../state/ui';

/**
 * People whose hub is outside the visible canvas stay on screen as a small avatar pinned to the
 * edge, with a triangle pointing to where they are. Clicking one flies to that person.
 * Must render inside <ReactFlow>.
 */
export function OffscreenMarkers({ onPick }: { onPick: (personId: string) => void }) {
  const focus = useUI(selectFocusPersonId);
  const viewport = useViewport();
  const width = useStore((s) => s.width);
  const height = useStore((s) => s.height);
  const people = useNodes<MapNode>().filter((n): n is PersonNodeType => n.type === 'person');

  const markers = computeEdgeMarkers(
    people.map((n) => ({
      id: n.id,
      center: {
        x: n.position.x + PERSON_NODE.avatarCenter.x,
        y: n.position.y + PERSON_NODE.avatarCenter.y,
      },
    })),
    viewport,
    { width, height },
  );
  if (markers.length === 0) return null;

  const byId = new Map(people.map((n) => [n.id, n.data.person]));
  return (
    <div className={styles.layer} aria-label="People outside the view">
      {markers.map((m) => {
        const person = byId.get(m.id);
        if (!person) return null;
        return (
          <button
            key={m.id}
            type="button"
            className={
              focus !== null && focus !== m.id ? `${styles.marker} ${styles.dimmed}` : styles.marker
            }
            style={
              { left: m.x, top: m.y, '--accent': personColor(person.colorIndex) } as CSSProperties
            }
            onClick={() => onPick(m.id)}
            title={`Go to ${person.name}`}
            aria-label={`Go to ${person.name}`}
          >
            <Avatar person={person} size={32} ring={3} />
            <span
              className={styles.arrow}
              style={{ transform: `translate(-50%, -50%) rotate(${m.angle}deg) translateX(29px)` }}
              aria-hidden="true"
            />
          </button>
        );
      })}
    </div>
  );
}
