import dagre from "dagre";
import type { ScriptEdge, ScriptNode } from "../types";

export const NODE_W = 250;
export const NODE_H = 96;

/**
 * dagre left→right auto-layout. Used ONCE when a graph is seeded or imported
 * without positions, and on the explicit „Пренареди" button in Редакция mode.
 * After that node positions are user-owned and persisted.
 */
export function autoLayout(nodes: ScriptNode[], edges: ScriptEdge[]): ScriptNode[] {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "LR", nodesep: 40, ranksep: 110, marginx: 40, marginy: 40 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const n of nodes) g.setNode(n.id, { width: NODE_W, height: NODE_H });
  for (const e of edges) {
    if (nodes.some((n) => n.id === e.source) && nodes.some((n) => n.id === e.target)) {
      g.setEdge(e.source, e.target);
    }
  }

  dagre.layout(g);

  return nodes.map((n) => {
    const pos = g.node(n.id) as { x: number; y: number } | undefined;
    if (!pos) return n;
    return {
      ...n,
      // dagre gives the node centre; React Flow wants the top-left corner.
      position: { x: Math.round(pos.x - NODE_W / 2), y: Math.round(pos.y - NODE_H / 2) },
    };
  });
}
