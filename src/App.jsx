import "./App.css";

import "reactflow/dist/style.css";

import { useCallback } from "react";
import { Header } from "./components/Header";
import { useAppStore } from "./store";
import { ReactFlow, Position, Handle } from "reactflow";
import {
  useStore,
  getBezierPath,
  useNodesState,
  useEdgesState,
  addEdge,
  NodeResizer,
} from "reactflow";
import { Avatar, Checkbox } from "antd";
import { useWindowDimensions } from "./hooks/windowDimensions";
import { getInitials } from "./utils.js";

function PersonNode({ data }) {
  const { person } = data;

  return (
    <div className="person-node">
      <Handle type="target" position={Position.Top} />
      <Avatar
        style={{ borderWidth: 5, borderColor: person.outlineColor }}
        size={80}
        src={person.avatarUrl}
      >
        {getInitials(person.name)}
      </Avatar>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

function PersonItemNode({ data }) {
  const { item: itemProp, person, nodeSize } = data;
  const item = useAppStore((store) =>
    store.people[person.id].items.find((el) => el.id === itemProp.id),
  );
  const toggleCompleteItem = useAppStore((store) => store.toggleCompleteItem);
  const updateItemText = useAppStore((store) => store.updateItemText);
  const handleIsCompletedChanged = () => {
    toggleCompleteItem(person.id, item.id);
  };
  const handleItemTextChange = (e) => {
    updateItemText(person.id, item.id, e.target.value);
  };
  return (
    <>
      <NodeResizer
        isVisible={true}
        minWidth={nodeSize[0]}
        minHeight={nodeSize[1]}
      />
      <Handle type="target" position={Position.Top} />
      <div
        className="item-node"
        style={{ minWidth: nodeSize[0], minHeight: nodeSize[1] }}
      >
        <div className="item-header">
          <h2 className="item-title">{item.title}</h2>
          <Checkbox
            checked={item.isComplete}
            onChange={handleIsCompletedChanged}
          ></Checkbox>
        </div>
        <textarea
          className="item-text nowheel"
          onChange={handleItemTextChange}
          value={item.text}
        ></textarea>
      </div>
      <Handle type="target" position={Position.Bottom} />
    </>
  );
}

const nodeTypes = {
  personNode: PersonNode,
  personalItem: PersonItemNode,
};

const edgeTypes = {
  floating: FloatingEdge,
};

function getNodeIntersection(intersectionNode, targetNode) {
  // https://math.stackexchange.com/questions/1724792/an-algorithm-for-finding-the-intersection-point-between-a-center-of-vision-and-a
  const {
    width: intersectionNodeWidth,
    height: intersectionNodeHeight,
    positionAbsolute: intersectionNodePosition,
  } = intersectionNode;
  const targetPosition = targetNode.positionAbsolute;

  const w = intersectionNodeWidth / 2;
  const h = intersectionNodeHeight / 2;

  const x2 = intersectionNodePosition.x + w;
  const y2 = intersectionNodePosition.y + h;
  const x1 = targetPosition.x + targetNode.width / 2;
  const y1 = targetPosition.y + targetNode.height / 2;

  const xx1 = (x1 - x2) / (2 * w) - (y1 - y2) / (2 * h);
  const yy1 = (x1 - x2) / (2 * w) + (y1 - y2) / (2 * h);
  const a = 1 / (Math.abs(xx1) + Math.abs(yy1));
  const xx3 = a * xx1;
  const yy3 = a * yy1;
  const x = w * (xx3 + yy3) + x2;
  const y = h * (-xx3 + yy3) + y2;

  return { x, y };
}

function getEdgePosition(node, intersectionPoint) {
  const n = { ...node.positionAbsolute, ...node };
  const nx = Math.round(n.x);
  const ny = Math.round(n.y);
  const px = Math.round(intersectionPoint.x);
  const py = Math.round(intersectionPoint.y);

  if (px <= nx + 1) {
    return Position.Left;
  }
  if (px >= nx + n.width - 1) {
    return Position.Right;
  }
  if (py <= ny + 1) {
    return Position.Top;
  }
  if (py >= n.y + n.height - 1) {
    return Position.Bottom;
  }

  return Position.Top;
}

export function getEdgeParams(source, target) {
  const sourceIntersectionPoint = getNodeIntersection(source, target);
  const targetIntersectionPoint = getNodeIntersection(target, source);

  const sourcePos = getEdgePosition(source, sourceIntersectionPoint);
  const targetPos = getEdgePosition(target, targetIntersectionPoint);

  return {
    sx: sourceIntersectionPoint.x,
    sy: sourceIntersectionPoint.y,
    tx: targetIntersectionPoint.x,
    ty: targetIntersectionPoint.y,
    sourcePos,
    targetPos,
  };
}

function FloatingEdge({ id, source, target, markerEnd, style }) {
  const sourceNode = useStore(
    useCallback((store) => store.nodeInternals.get(source), [source]),
  );
  const targetNode = useStore(
    useCallback((store) => store.nodeInternals.get(target), [target]),
  );

  if (!sourceNode || !targetNode) {
    return null;
  }

  // Get the outlineColor from the source node's data if available
  const outlineColor = sourceNode.data?.person?.outlineColor || '#222';

  const { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(
    sourceNode,
    targetNode,
  );

  const [edgePath] = getBezierPath({
    sourceX: sx,
    sourceY: sy,
    sourcePosition: sourcePos,
    targetPosition: targetPos,
    targetX: tx,
    targetY: ty,
  });

  return (
    <path
      id={id}
      className="react-flow__edge-path"
      d={edgePath}
      markerEnd={markerEnd}
      style={{ stroke: outlineColor, strokeWidth: 5, ...style }}
    />
  );
}

function FloatingConnectionLine({
  toX,
  toY,
  fromPosition,
  toPosition,
  fromNode,
}) {
  if (!fromNode) {
    return null;
  }

  // Get the outlineColor from the fromNode's data if available
  const outlineColor = fromNode.data?.person?.outlineColor || '#222';

  const targetNode = {
    id: "connection-target",
    width: 1,
    height: 1,
    positionAbsolute: { x: toX, y: toY },
  };

  const { sx, sy } = getEdgeParams(fromNode, targetNode);
  const [edgePath] = getBezierPath({
    sourceX: sx,
    sourceY: sy,
    sourcePosition: fromPosition,
    targetPosition: toPosition,
    targetX: toX,
    targetY: toY,
  });

  return (
    <g>
      <path
        fill="none"
        stroke={outlineColor}
        strokeWidth={5}
        className="animated"
        d={edgePath}
      />
      <circle
        cx={toX}
        cy={toY}
        fill="#fff"
        r={3}
        stroke={outlineColor}
        strokeWidth={5}
      />
    </g>
  );
}

function App() {
  const people = useAppStore((store) => store.people);
  const { height, width } = useWindowDimensions();
  const viewportHeight = Math.min(height, 1440);
  const viewportWidth = Math.min(width, 2560);
  const nodesPerRowCount = 2;
  const nodesPerColCount = 2;
  const nodeSize = 80;
  const personItemNodeSize = [250, 150];
  const horizontalSpacing = Math.max(
    viewportWidth / (nodesPerRowCount + 1) - nodeSize / 2,
    (nodeSize + personItemNodeSize[0] + 100) * 2,
  );
  const verticalSpacing = Math.max(
    viewportHeight / (nodesPerColCount + 1) - nodeSize / 2,
    (nodeSize + personItemNodeSize[1] + 100) * 2,
  );
  const initialNodes = [];
  const initialEdges = [];
  const radius = 200;

  let currRow = -1;
  let currCol = 0;

  Object.values(people).forEach((person, i) => {
    currCol = i;
    if (currCol % nodesPerRowCount === 0) {
      currRow += 1;
      currCol = 0;
    }
    const [x, y] = [
      horizontalSpacing + currCol * horizontalSpacing,
      verticalSpacing + currRow * verticalSpacing,
    ];
    initialNodes.push({
      id: person.id,
      type: "personNode",
      position: {
        x,
        y,
      },
      data: { person },
    });

    const numElements = person.items.length;
    const angleIncrement = (2 * Math.PI) / numElements;
    const rotation = 10 * (Math.PI / 180);
    const centerX = x;
    const centerY = y;

    const itemNodes = person.items.map((item, i) => {
      const angle = i * angleIncrement;
      const x = centerX + radius * Math.cos(angle + rotation);
      const y = centerY + radius * Math.sin(angle + rotation);
      return {
        id: item.id,
        type: "personalItem",
        position: {
          x: x - (personItemNodeSize[0] / 2 - nodeSize / 2),
          y: y - (personItemNodeSize[1] / 2 - nodeSize / 2),
        },
        data: { item, person, nodeSize: personItemNodeSize },
      };
    });

    itemNodes.forEach((n) => {
      initialNodes.push(n);
      initialEdges.push({
        id: `e-${person.id}-${n.id}`,
        source: person.id,
        target: n.id,
        type: "floating",
      });
    });
  });

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: "floating",
          },
          eds,
        ),
      ),
    [setEdges],
  );

  return (
    <div className="app-container">
      <Header />
      <div className="main">
        <div className="reactflow-container">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onConnect={onConnect}
            connectionLineComponent={FloatingConnectionLine}
            nodesDraggable={true}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
