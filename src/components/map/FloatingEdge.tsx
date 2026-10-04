import { BaseEdge, getBezierPath, useInternalNode, type EdgeProps } from '@xyflow/react';
import { useEffect, useState } from 'react';
import { getEdgeParams } from '../../map/edgeGeometry';
import { markEnterPlayed, shouldPlayEnter } from '../../map/enterFx';
import type { FloatingEdgeType, MapNode } from '../../map/graph';
import { CARD, PERSON_NODE } from '../../map/layout';
import { selectFocusPersonId, useUI } from '../../state/ui';
import styles from './FloatingEdge.module.css';

/** Curve from the edge of a person's ring to the nearest side of a card, in the person's colour. */
export function FloatingEdge({ id, source, target, data, style }: EdgeProps<FloatingEdgeType>) {
  const sourceNode = useInternalNode<MapNode>(source);
  const targetNode = useInternalNode<MapNode>(target);
  const focus = useUI(selectFocusPersonId);
  const projectFocus = useUI((s) => s.projectFocusId);
  const dimmed =
    (focus !== null && focus !== source) ||
    (projectFocus !== null && data?.projectId !== projectFocus);

  // An edge to a card created in this session draws itself from the hub outwards, once.
  // The creation time rides on the edge data: the edge can mount before its node is looked up.
  const enterKey = `edge:${target}`;
  const [drawing, setDrawing] = useState(() => shouldPlayEnter(enterKey, data?.createdAt ?? 0));
  useEffect(() => {
    if (drawing) markEnterPlayed(enterKey);
  }, [drawing, enterKey]);

  if (!sourceNode || !targetNode) return null;

  const s = sourceNode.internals.positionAbsolute;
  const t = targetNode.internals.positionAbsolute;
  const { sx, sy, tx, ty, sourcePosition, targetPosition } = getEdgeParams(
    {
      cx: s.x + PERSON_NODE.avatarCenter.x,
      cy: s.y + PERSON_NODE.avatarCenter.y,
      r: PERSON_NODE.ringRadius,
    },
    {
      x: t.x,
      y: t.y,
      width: targetNode.measured.width ?? CARD.width,
      height: targetNode.measured.height ?? CARD.height,
    },
  );
  const [path] = getBezierPath({
    sourceX: sx,
    sourceY: sy,
    sourcePosition,
    targetX: tx,
    targetY: ty,
    targetPosition,
    curvature: 0.35,
  });

  return (
    <BaseEdge
      id={id}
      path={path}
      interactionWidth={0}
      className={
        [drawing && styles.draw, dimmed && styles.dimmed].filter(Boolean).join(' ') || undefined
      }
      pathLength={1}
      onAnimationEnd={() => setDrawing(false)}
      style={{ stroke: data?.color ?? '#666', strokeWidth: 3.5, strokeLinecap: 'round', ...style }}
    />
  );
}
