import type { Campaign, ScriptEdge, ScriptNode } from "../types";
import { uid } from "./id";

export type Script = Campaign["script"];

/**
 * Adds an edge. Refuses self-loops and duplicates so a slipped drag can't
 * quietly create a second identical connection.
 */
export function connectNodes(script: Script, source: string, target: string): Script {
  if (!source || !target || source === target) return script;
  if (!script.nodes.some((n) => n.id === source) || !script.nodes.some((n) => n.id === target)) {
    return script;
  }
  if (script.edges.some((e) => e.source === source && e.target === target)) return script;
  const edge: ScriptEdge = { id: uid("edge"), source, target };
  return { ...script, edges: [...script.edges, edge] };
}

/** Removes a node and every edge touching it. */
export function deleteNode(script: Script, id: string): Script {
  return {
    nodes: script.nodes.filter((n) => n.id !== id),
    edges: script.edges.filter((e) => e.source !== id && e.target !== id),
  };
}

/** Writes dragged positions back onto the campaign's nodes, rounded. */
export function commitPositions(
  nodes: ScriptNode[],
  moved: { id: string; position: { x: number; y: number } }[],
): ScriptNode[] {
  if (moved.length === 0) return nodes;
  return nodes.map((n) => {
    const hit = moved.find((m) => m.id === n.id);
    if (!hit) return n;
    return { ...n, position: { x: Math.round(hit.position.x), y: Math.round(hit.position.y) } };
  });
}

export function patchNode(nodes: ScriptNode[], id: string, patch: Partial<ScriptNode>): ScriptNode[] {
  return nodes.map((n) => (n.id === id ? { ...n, ...patch } : n));
}

export function patchEdge(edges: ScriptEdge[], id: string, patch: Partial<ScriptEdge>): ScriptEdge[] {
  return edges.map((e) => (e.id === id ? { ...e, ...patch } : e));
}

export function newNodeAt(position: { x: number; y: number }): ScriptNode {
  return {
    id: uid("node"),
    title: "Нов възел",
    body: "",
    group: "НОВО",
    color: "blue",
    position: { x: Math.round(position.x), y: Math.round(position.y) },
  };
}
