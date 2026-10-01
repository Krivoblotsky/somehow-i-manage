import '@xyflow/react/dist/style.css';
import * as ContextMenu from '@radix-ui/react-context-menu';
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useNodesInitialized,
  useReactFlow,
  useStore,
  type EdgeTypes,
  type NodeMouseHandler,
  type NodeTypes,
  type OnNodeDrag,
} from '@xyflow/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createItem,
  deletePerson,
  moveItem,
  resetMapLayout,
  setItemMapPosition,
  setPersonMapPosition,
} from '../../data/repository';
import { useDatabase, useIsDemo } from '../../data/DatabaseContext';
import { findDropTarget, type DropCandidate } from '../../map/dropTarget';
import {
  buildGraph,
  type FloatingEdgeType,
  type MapNode,
  type PersonNodeType,
} from '../../map/graph';
import { CARD, PERSON_NODE } from '../../map/layout';
import type { Item, ItemKind, Person } from '../../model/types';
import { startOneOnOne } from '../../state/actions';
import { useUI } from '../../state/ui';
import { ItemMenuItems } from '../ItemContextMenu';
import menu from '../menu.module.css';
import { FloatingEdge } from './FloatingEdge';
import { ItemNode } from './ItemNode';
import { MapTips } from './MapTips';
import { FeedbackIsland } from './FeedbackIsland';
import { OffscreenMarkers } from './OffscreenMarkers';
import styles from './PeopleMap.module.css';
import { PersonNode } from './PersonNode';

const nodeTypes: NodeTypes = { person: PersonNode, item: ItemNode };
const edgeTypes: EdgeTypes = { floating: FloatingEdge };
// Room for the floating header above and a little air around; React Flow takes px here.
const fitViewOptions = {
  padding: { top: '128px', right: '40px', bottom: '40px', left: '40px' } as const,
  maxZoom: 1,
};
/** The landing-page demo has no floating header to make room for. */
const demoFitViewOptions = {
  padding: { top: '72px', right: '32px', bottom: '32px', left: '32px' } as const,
  maxZoom: 1,
};

/** The side pane floats over this much of the canvas's right edge (400px + 24px margin). */
const PANE_COVER = 424;
/** ...and only in the desktop layout; below this the pane covers the whole view anyway. */
const PANE_OVERLAY_MIN_WIDTH = 961;
/** How long the pane takes to slide in (App.module.css). */
const PANE_SLIDE_MS = 280;

/**
 * Follows `value`, but a larger value only lands after `ms`: the covered strip grows when the
 * pane has finished sliding in, and shrinks the moment it starts leaving.
 */
function useLagging(value: number, ms: number): number {
  const [shown, setShown] = useState(value);
  if (value < shown) setShown(value);
  useEffect(() => {
    if (value <= shown) return;
    const t = window.setTimeout(() => setShown(value), ms);
    return () => window.clearTimeout(t);
  }, [value, shown, ms]);
  return shown;
}
/** How close a dragged card must get to a person's avatar centre to count as a drop. */
const DROP_RADIUS = PERSON_NODE.ringRadius + 30;

type MenuTarget =
  { kind: 'pane' } | { kind: 'person'; person: Person } | { kind: 'item'; item: Item } | null;

interface PeopleMapProps {
  people: Person[];
  items: Item[];
  /** Open on this person's cluster instead of fitting everyone (the landing-page demo). */
  focusPersonId?: string;
}

/** The People Map: every person is a hub, their tasks and notes orbit them. */
export function PeopleMap(props: PeopleMapProps) {
  return (
    <ReactFlowProvider>
      <Canvas {...props} />
    </ReactFlowProvider>
  );
}

function Canvas({ people, items, focusPersonId }: PeopleMapProps) {
  const database = useDatabase();
  const demo = useIsDemo();
  const selectedItemId = useUI((s) => s.selectedItemId);
  const selectedPersonId = useUI((s) => s.selectedPersonId);
  const personPanelOpen = useUI((s) => s.personPanelOpen);
  const focusRequest = useUI((s) => s.focusRequest);
  const selectItem = useUI((s) => s.selectItem);
  const selectPerson = useUI((s) => s.selectPerson);
  const closePanel = useUI((s) => s.closePanel);
  const openDialog = useUI((s) => s.openDialog);
  const focusPerson = useUI((s) => s.focusPerson);
  const { fitView, getNodes, getInternalNode, updateNodeData, screenToFlowPosition } = useReactFlow<
    MapNode,
    FloatingEdgeType
  >();
  // The side pane floats over the right edge: fits and edge markers treat that strip as hidden.
  const flowWidth = useStore((st) => st.width);
  const flowHeight = useStore((st) => st.height);
  const paneOpen = !demo && (selectedItemId !== null || personPanelOpen);
  const covered = useLagging(
    paneOpen && flowWidth >= PANE_OVERLAY_MIN_WIDTH ? PANE_COVER : 0,
    PANE_SLIDE_MS,
  );
  const fit = useMemo(() => {
    const base = demo ? demoFitViewOptions : fitViewOptions;
    if (covered === 0) return base;
    const right = `${parseInt(base.padding.right, 10) + covered}px` as const;
    return { ...base, padding: { ...base.padding, right } };
  }, [demo, covered]);
  // Framing one cluster: 15% of the shorter side around it, plus the covered strip.
  const clusterPadding = useMemo(() => {
    const side = `${Math.round(Math.min(flowWidth, flowHeight) * 0.15)}px` as const;
    const right = `${Math.round(Math.min(flowWidth, flowHeight) * 0.15) + covered}px` as const;
    return { top: side, bottom: side, left: side, right };
  }, [flowWidth, flowHeight, covered]);

  // How this map frames itself: on one person's cluster when asked, otherwise on everyone.
  const frame = useCallback(() => {
    if (focusPersonId) {
      const ids = getNodes()
        .filter(
          (n) =>
            n.id === focusPersonId || (n.type === 'item' && n.data.item.personId === focusPersonId),
        )
        .map((n) => ({ id: n.id }));
      if (ids.length > 0) return fitView({ nodes: ids, padding: clusterPadding, maxZoom: 1 });
    }
    return fitView(fit);
  }, [focusPersonId, getNodes, fitView, fit, clusterPadding]);

  // The demo's frame changes size with the page (phones, rotations): keep it framed.
  useEffect(() => {
    if (demo && flowWidth > 0 && flowHeight > 0) void frame();
  }, [demo, flowWidth, flowHeight, frame]);

  const graph = useMemo(
    () =>
      buildGraph(people, items, {
        itemId: selectedItemId,
        personId: selectedPersonId,
        personPanelOpen,
      }),
    [people, items, selectedItemId, selectedPersonId, personPanelOpen],
  );
  const [nodes, setNodes, onNodesChange] = useNodesState<MapNode>(graph.nodes);
  useEffect(() => {
    setNodes(graph.nodes);
  }, [graph.nodes, setNodes]);

  // Bring a person's cluster into view when the header asks for it.
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  useEffect(() => {
    if (!focusRequest) return;
    // A stale request (e.g. from the landing-page demo) names a person this map does not have.
    if (!getNodes().some((n) => n.id === focusRequest.personId)) return;
    const ids = [
      focusRequest.personId,
      ...itemsRef.current.filter((i) => i.personId === focusRequest.personId).map((i) => i.id),
    ];
    const timer = window.setTimeout(() => {
      void fitView({
        nodes: ids.map((id) => ({ id })),
        duration: 400,
        padding: clusterPadding,
        maxZoom: 1,
      });
    }, 50);
    return () => window.clearTimeout(timer);
  }, [focusRequest, fitView, getNodes, clusterPadding]);

  // Re-fit when people are added or removed so a new cluster is never off-screen.
  const peopleCount = people.length;
  const lastCount = useRef(peopleCount);
  // People arrived or left (sample data, a restore): show everyone — once React Flow has
  // measured the new nodes, or the fit would only see the ones it already knows.
  // The landing-page demo frames its own view instead.
  const nodesInitialized = useNodesInitialized();
  useEffect(() => {
    if (demo || !nodesInitialized || lastCount.current === peopleCount) return;
    lastCount.current = peopleCount;
    void fitView({ ...fit, duration: 300 });
  }, [demo, nodesInitialized, peopleCount, fitView, fit]);

  // First frame on the requested person, once React Flow has measured the nodes.
  const framedOnce = useRef(false);
  useEffect(() => {
    if (!focusPersonId || !nodesInitialized || framedOnce.current) return;
    framedOnce.current = true;
    void frame();
  }, [focusPersonId, nodesInitialized, frame]);

  const [menuTarget, setMenuTarget] = useState<MenuTarget>(null);

  const onNodeClick: NodeMouseHandler<MapNode> = useCallback(
    (_, node) => {
      if (node.type === 'item') selectItem(node.id, node.data.item.personId);
      else selectPerson(node.id);
    },
    [selectItem, selectPerson],
  );

  // Dropping a card on another person's hub moves it to that person.
  const dropTargetRef = useRef<string | null>(null);

  const dropCandidates = useCallback((): DropCandidate[] => {
    return getNodes()
      .filter((n): n is PersonNodeType => n.type === 'person')
      .map((n) => {
        const abs = getInternalNode(n.id)?.internals.positionAbsolute ?? n.position;
        return {
          id: n.id,
          circle: {
            cx: abs.x + PERSON_NODE.avatarCenter.x,
            cy: abs.y + PERSON_NODE.avatarCenter.y,
            r: DROP_RADIUS,
          },
        };
      });
  }, [getNodes, getInternalNode]);

  const cardRect = useCallback(
    (node: MapNode) => {
      const internal = getInternalNode(node.id);
      const abs = internal?.internals.positionAbsolute ?? node.position;
      return {
        x: abs.x,
        y: abs.y,
        width: internal?.measured.width ?? CARD.width,
        height: internal?.measured.height ?? CARD.height,
      };
    },
    [getInternalNode],
  );

  // React Flow passes the native event; touches carry their point on the touch list.
  const pointerInFlow = useCallback(
    (event: MouseEvent | TouchEvent) => {
      const point = 'touches' in event ? (event.changedTouches[0] ?? event.touches[0]) : event;
      if (!point || !Number.isFinite(point.clientX)) return undefined;
      return screenToFlowPosition({ x: point.clientX, y: point.clientY });
    },
    [screenToFlowPosition],
  );

  const onNodeDrag: OnNodeDrag<MapNode> = useCallback(
    (event, node) => {
      if (node.type !== 'item') return;
      const target = findDropTarget(
        cardRect(node),
        dropCandidates(),
        node.data.item.personId,
        pointerInFlow(event),
      );
      if (target === dropTargetRef.current) return;
      if (dropTargetRef.current) updateNodeData(dropTargetRef.current, { isDropTarget: false });
      if (target) updateNodeData(target, { isDropTarget: true });
      dropTargetRef.current = target;
    },
    [cardRect, dropCandidates, pointerInFlow, updateNodeData],
  );

  const onNodeDragStop: OnNodeDrag<MapNode> = useCallback(
    (event, _, dragged) => {
      if (dropTargetRef.current) {
        updateNodeData(dropTargetRef.current, { isDropTarget: false });
        dropTargetRef.current = null;
      }
      const candidates = dropCandidates();
      const pointer = pointerInFlow(event);
      for (const node of dragged) {
        if (node.type === 'person') {
          void setPersonMapPosition(node.id, node.position, database);
          continue;
        }
        const target = findDropTarget(cardRect(node), candidates, node.data.item.personId, pointer);
        if (target) void moveItem(node.data.item.id, target, database);
        else void setItemMapPosition(node.id, node.position, database);
      }
    },
    [cardRect, dropCandidates, pointerInFlow, updateNodeData, database],
  );

  const onNodeContextMenu: NodeMouseHandler<MapNode> = useCallback((_, node) => {
    setMenuTarget(
      node.type === 'person'
        ? { kind: 'person', person: node.data.person }
        : { kind: 'item', item: node.data.item },
    );
  }, []);

  async function addItem(personId: string, kind: ItemKind) {
    const created = await createItem({ personId, kind }, database);
    selectItem(created.id, personId);
  }

  async function removePerson(person: Person) {
    const count = items.filter((i) => i.personId === person.id).length;
    const what = count ? ` and their ${count} item${count === 1 ? '' : 's'}` : '';
    if (window.confirm(`Delete ${person.name}${what}? This cannot be undone.`)) {
      await deletePerson(person.id, database);
      selectPerson(null);
    }
  }

  return (
    <ContextMenu.Root
      onOpenChange={(open) => {
        if (!open) setMenuTarget(null);
      }}
    >
      <ContextMenu.Trigger asChild>
        <div className={styles.canvas} data-testid="people-map">
          <ReactFlow<MapNode, FloatingEdgeType>
            nodes={nodes}
            edges={graph.edges}
            onNodesChange={onNodesChange}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodeClick={onNodeClick}
            onPaneClick={closePanel}
            onNodeDrag={onNodeDrag}
            onNodeDragStop={onNodeDragStop}
            onNodeContextMenu={onNodeContextMenu}
            onPaneContextMenu={() => setMenuTarget({ kind: 'pane' })}
            fitView={!focusPersonId}
            fitViewOptions={fit}
            attributionPosition="bottom-center"
            panOnScroll
            // our own stacking: edges (0) under hubs (1) under cards (2); React Flow would lift
            // an edge to its card's level and draw it over the hub's name
            zIndexMode="manual"
            minZoom={0.2}
            maxZoom={2}
            zoomOnScroll={false}
            zoomOnDoubleClick={false}
            nodesConnectable={false}
            edgesFocusable={false}
            deleteKeyCode={null}
            selectionKeyCode={null}
            multiSelectionKeyCode={null}
            nodeDragThreshold={4}
          >
            <Background variant={BackgroundVariant.Dots} gap={36} size={1} />
            <Controls showInteractive={false} position="bottom-left" fitViewOptions={fit} />
            <OffscreenMarkers onPick={focusPerson} coveredRight={covered} />
          </ReactFlow>
          {!demo && <MapTips />}
          {!demo && <FeedbackIsland hidden={paneOpen} />}
        </div>
      </ContextMenu.Trigger>

      <ContextMenu.Portal>
        <ContextMenu.Content className={menu.menu}>
          {menuTarget?.kind === 'person' && (
            <PersonMenu
              person={menuTarget.person}
              demo={demo}
              onMeet={() => void startOneOnOne(menuTarget.person.id)}
              onAdd={(kind) => void addItem(menuTarget.person.id, kind)}
              onPaste={() => openDialog({ type: 'bulk', personId: menuTarget.person.id })}
              onEdit={() => openDialog({ type: 'person', personId: menuTarget.person.id })}
              onDelete={() => void removePerson(menuTarget.person)}
            />
          )}
          {menuTarget?.kind === 'item' && <ItemMenuItems item={menuTarget.item} />}
          {(menuTarget === null || menuTarget.kind === 'pane') && (
            <>
              {!demo && (
                <ContextMenu.Item
                  className={menu.item}
                  onSelect={() => openDialog({ type: 'person' })}
                >
                  Add new person…
                </ContextMenu.Item>
              )}
              <ContextMenu.Item
                className={menu.item}
                onSelect={() => void fitView({ ...fit, duration: 300 })}
              >
                Fit to screen
              </ContextMenu.Item>
              <ContextMenu.Item
                className={menu.item}
                onSelect={() => {
                  // new positions arrive through the live query; fit once they have landed
                  void resetMapLayout(database).then(() =>
                    window.setTimeout(() => void fitView({ ...fit, duration: 400 }), 350),
                  );
                }}
              >
                Tidy up the map
              </ContextMenu.Item>
            </>
          )}
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}

function PersonMenu({
  person,
  demo,
  onMeet,
  onAdd,
  onPaste,
  onEdit,
  onDelete,
}: {
  person: Person;
  demo: boolean;
  onMeet: () => void;
  onAdd: (kind: ItemKind) => void;
  onPaste: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <>
      <ContextMenu.Label className={menu.label}>{person.name}</ContextMenu.Label>
      {!demo && (
        <ContextMenu.Item className={menu.item} onSelect={onMeet}>
          Start 1:1
        </ContextMenu.Item>
      )}
      <ContextMenu.Item className={menu.item} onSelect={() => onAdd('task')}>
        New task
      </ContextMenu.Item>
      <ContextMenu.Item className={menu.item} onSelect={() => onAdd('note')}>
        New note
      </ContextMenu.Item>
      {!demo && (
        <>
          <ContextMenu.Item className={menu.item} onSelect={onPaste}>
            Paste list…
          </ContextMenu.Item>
          <ContextMenu.Item className={menu.item} onSelect={onEdit}>
            Edit person…
          </ContextMenu.Item>
        </>
      )}
      <ContextMenu.Separator className={menu.separator} />
      <ContextMenu.Item className={`${menu.item} ${menu.danger}`} onSelect={onDelete}>
        Delete person…
      </ContextMenu.Item>
    </>
  );
}
