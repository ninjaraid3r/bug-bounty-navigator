import { useMemo, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Position,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

export interface ReconNodeRow {
  id: string;
  node_key: string;
  parent_key: string | null;
  label: string;
  node_type: string;
  metadata?: any;
}

const TYPE_COLORS: Record<string, { bg: string; border: string; fg: string }> = {
  root:      { bg: "hsl(45 100% 50% / 0.18)", border: "hsl(45 100% 55%)", fg: "hsl(45 100% 65%)" },
  domain:    { bg: "hsl(45 90% 50% / 0.10)", border: "hsl(45 80% 50%)", fg: "hsl(45 90% 70%)" },
  subdomain: { bg: "hsl(220 20% 12%)",        border: "hsl(45 50% 40%)", fg: "hsl(45 80% 75%)" },
  ip:        { bg: "hsl(220 20% 12%)",        border: "hsl(190 60% 45%)", fg: "hsl(190 80% 75%)" },
  endpoint:  { bg: "hsl(220 20% 10%)",        border: "hsl(280 50% 50%)", fg: "hsl(280 70% 80%)" },
  bucket:    { bg: "hsl(220 20% 10%)",        border: "hsl(20 80% 50%)",  fg: "hsl(20 90% 75%)" },
  panel:     { bg: "hsl(220 20% 10%)",        border: "hsl(0 70% 50%)",   fg: "hsl(0 80% 80%)" },
  tech:      { bg: "hsl(220 20% 10%)",        border: "hsl(140 50% 40%)", fg: "hsl(140 70% 75%)" },
  note:      { bg: "hsl(220 20% 10%)",        border: "hsl(220 10% 35%)", fg: "hsl(220 10% 75%)" },
};

function colorFor(type: string) {
  return TYPE_COLORS[type] || TYPE_COLORS.note;
}

// Radial layout: root at center, children fanned in concentric rings.
function layout(nodes: ReconNodeRow[]): { rfNodes: Node[]; rfEdges: Edge[] } {
  const byKey = new Map(nodes.map((n) => [n.node_key, n]));
  const childrenOf = new Map<string | null, ReconNodeRow[]>();
  for (const n of nodes) {
    const p = n.parent_key && byKey.has(n.parent_key) ? n.parent_key : null;
    if (!childrenOf.has(p)) childrenOf.set(p, []);
    childrenOf.get(p)!.push(n);
  }

  const positions = new Map<string, { x: number; y: number; depth: number }>();
  const roots = childrenOf.get(null) || [];
  // Single virtual root anchor at (0,0)
  const RADIUS = 220;

  function place(key: string, depth: number, angleStart: number, angleEnd: number) {
    const angle = (angleStart + angleEnd) / 2;
    const r = depth * RADIUS;
    positions.set(key, {
      x: Math.cos(angle) * r,
      y: Math.sin(angle) * r,
      depth,
    });
    const kids = childrenOf.get(key) || [];
    if (!kids.length) return;
    const span = Math.max((angleEnd - angleStart), Math.PI / 6);
    const step = span / kids.length;
    kids.forEach((k, i) => {
      const a0 = angleStart + step * i;
      const a1 = a0 + step;
      place(k.node_key, depth + 1, a0, a1);
    });
  }

  if (roots.length === 1) {
    place(roots[0].node_key, 0, 0, Math.PI * 2);
  } else {
    const step = (Math.PI * 2) / Math.max(roots.length, 1);
    roots.forEach((r, i) => place(r.node_key, 1, step * i - step / 2, step * i + step / 2));
  }

  const rfNodes: Node[] = nodes.map((n) => {
    const pos = positions.get(n.node_key) || { x: 0, y: 0, depth: 0 };
    const c = colorFor(n.node_type);
    const isRoot = n.node_type === "root";
    return {
      id: n.node_key,
      position: { x: pos.x, y: pos.y },
      data: { label: n.label },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      style: {
        background: c.bg,
        border: `1px solid ${c.border}`,
        color: c.fg,
        fontFamily: "JetBrains Mono, monospace",
        fontSize: isRoot ? 13 : 11,
        fontWeight: isRoot ? 700 : 500,
        padding: isRoot ? "10px 14px" : "6px 10px",
        borderRadius: 6,
        boxShadow: isRoot ? `0 0 24px ${c.border}` : "none",
        letterSpacing: "0.04em",
      },
    };
  });

  const rfEdges: Edge[] = nodes
    .filter((n) => n.parent_key && byKey.has(n.parent_key))
    .map((n) => ({
      id: `${n.parent_key}->${n.node_key}`,
      source: n.parent_key!,
      target: n.node_key,
      animated: false,
      style: { stroke: "hsl(45 50% 35%)", strokeWidth: 1 },
    }));

  return { rfNodes, rfEdges };
}

export default function ReconMindMap({ nodes }: { nodes: ReconNodeRow[] }) {
  const { rfNodes, rfEdges } = useMemo(() => layout(nodes), [nodes]);
  const [flowNodes, setNodes] = useNodesState(rfNodes);
  const [flowEdges, setEdges] = useEdgesState(rfEdges);

  useEffect(() => {
    setNodes(rfNodes);
    setEdges(rfEdges);
  }, [rfNodes, rfEdges, setNodes, setEdges]);

  if (!nodes.length) {
    return (
      <div className="h-[420px] grid place-items-center border border-border rounded-md bg-surface-2/30 text-xs font-mono text-muted-foreground">
        No nodes captured for this map yet.
      </div>
    );
  }

  return (
    <div className="h-[480px] border border-border rounded-md overflow-hidden bg-background">
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        proOptions={{ hideAttribution: true }}
        minZoom={0.1}
        maxZoom={2}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
      >
        <Background color="hsl(45 30% 20%)" gap={20} />
        <Controls className="!bg-surface-2 !border-border" />
        <MiniMap
          pannable
          zoomable
          maskColor="hsl(220 20% 6% / 0.7)"
          nodeColor={(n) => (n.style?.borderColor as string) || "hsl(45 50% 40%)"}
          style={{ background: "hsl(220 20% 9%)", border: "1px solid hsl(220 10% 20%)" }}
        />
      </ReactFlow>
    </div>
  );
}
