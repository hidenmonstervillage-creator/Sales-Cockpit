import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import type { Connection, Edge, EdgeMouseHandler, NodeMouseHandler } from "@xyflow/react";
import type { Campaign, ScriptEdge, ScriptNode } from "../types";
import type { TokenContext } from "../lib/placeholders";
import { resolveText } from "../lib/placeholders";
import { useStore } from "../store";
import {
  commitPositions,
  connectNodes,
  deleteNode,
  newNodeAt,
  patchEdge,
  patchNode,
} from "../lib/script";
import { autoLayout } from "../lib/layout";
import { colorHex } from "../lib/palette";
import { ScriptNodeCard } from "./ScriptNodeCard";
import type { CardData, CardNode } from "./ScriptNodeCard";
import { ReadingPane } from "./ReadingPane";
import { Calculator } from "./Calculator";
import { NodeDrawer } from "./NodeDrawer";
import { EdgeDrawer } from "./EdgeDrawer";

const nodeTypes = { card: ScriptNodeCard };

export type ScriptMode = "call" | "edit";

interface Props {
  campaign: Campaign;
  ctx: TokenContext;
  avgService: number | undefined;
  onAvgServiceChange: (v: number | undefined) => void;
  onFocusVerbatim: () => void;
  onSetStatus: (statusId: string) => void;
}

function toRfEdge(e: ScriptEdge, selected: boolean): Edge {
  const strong = Boolean(e.label);
  const stroke = selected ? colorHex("blue") : strong ? "#5a6480" : "#39405a";
  return {
    id: e.id,
    source: e.source,
    target: e.target,
    type: "smoothstep",
    label: e.label,
    labelShowBg: Boolean(e.label),
    labelBgPadding: [4, 2],
    labelBgBorderRadius: 3,
    labelBgStyle: { fill: "#0c0e14", stroke: "none" },
    labelStyle: { fill: "#a8b0c4", fontSize: 10 },
    markerEnd: { type: MarkerType.ArrowClosed, color: stroke, width: 14, height: 14 },
    style: {
      stroke,
      strokeWidth: selected ? 2.4 : strong ? 1.6 : 1,
      strokeDasharray: e.dashed ? "6 4" : undefined,
    },
  };
}

function ScriptPanelInner({
  campaign,
  ctx,
  avgService,
  onAvgServiceChange,
  onFocusVerbatim,
  onSetStatus,
}: Props) {
  const { updateCampaign } = useStore();
  const [mode, setMode] = useState<ScriptMode>("call");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [drawerNodeId, setDrawerNodeId] = useState<string | null>(null);
  const [drawerEdgeId, setDrawerEdgeId] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const { screenToFlowPosition, fitView } = useReactFlow();

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<CardNode>([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const scriptNodes = campaign.script.nodes;
  const scriptEdges = campaign.script.edges;

  // Signature of everything except positions — so dragging never re-seeds
  // (and therefore never clobbers) the live positions.
  const nodeSig = useMemo(
    () =>
      scriptNodes
        .map((n) =>
          [
            n.id,
            n.title,
            n.hint ?? "",
            n.group,
            n.color,
            n.body,
            n.imageDataUrl ? "1" : "0",
            String((n.actions ?? []).length),
          ].join(""),
        )
        .join(""),
    [scriptNodes],
  );
  const edgeSig = useMemo(
    () =>
      scriptEdges
        .map((e) => [e.id, e.source, e.target, e.label ?? "", e.dashed ? "1" : "0"].join(""))
        .join(""),
    [scriptEdges],
  );

  useEffect(() => {
    setRfNodes(
      scriptNodes.map((n): CardNode => {
        const data: CardData = {
          title: n.title,
          group: n.group,
          color: n.color,
          preview: resolveText(n.body, ctx).replace(/\s+/g, " ").trim(),
          hasImage: Boolean(n.imageDataUrl),
          hasActions: (n.actions ?? []).length > 0,
          active: n.id === selectedNodeId,
        };
        return {
          id: n.id,
          type: "card",
          position: n.position,
          data,
          // Per-node flags, so a stray drag mid-call cannot move a node or start an edge.
          draggable: mode === "edit",
          connectable: mode === "edit",
        };
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeSig, selectedNodeId, mode, ctx, campaign.id]);

  useEffect(() => {
    setRfEdges(scriptEdges.map((e) => toRfEdge(e, e.id === drawerEdgeId)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edgeSig, drawerEdgeId, campaign.id]);

  // Fresh campaign → frame the graph, drop stale selections.
  useEffect(() => {
    setSelectedNodeId(null);
    setDrawerNodeId(null);
    setDrawerEdgeId(null);
    const t = window.setTimeout(() => fitView({ padding: 0.2, duration: 0 }), 60);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaign.id]);

  const patchNodes = useCallback(
    (updater: (nodes: ScriptNode[]) => ScriptNode[]) => {
      updateCampaign((c) => ({ ...c, script: { ...c.script, nodes: updater(c.script.nodes) } }));
    },
    [updateCampaign],
  );

  const onNodeClick = useCallback<NodeMouseHandler>((_, node) => {
    setSelectedNodeId(node.id);
  }, []);

  const onNodeDoubleClick = useCallback<NodeMouseHandler>(
    (_, node) => {
      if (mode !== "edit") return;
      setDrawerEdgeId(null);
      setDrawerNodeId(node.id);
    },
    [mode],
  );

  const onNodeDragStop = useCallback(
    (_e: unknown, node: CardNode, dragged: CardNode[]) => {
      const moved = dragged.length ? dragged : [node];
      patchNodes((nodes) => commitPositions(nodes, moved));
    },
    [patchNodes],
  );

  const onEdgeClick = useCallback<EdgeMouseHandler>(
    (_, edge) => {
      if (mode !== "edit") return;
      setDrawerNodeId(null);
      setDrawerEdgeId(edge.id);
    },
    [mode],
  );

  const onConnect = useCallback(
    (conn: Connection) => {
      if (mode !== "edit") return;
      updateCampaign((c) => ({
        ...c,
        script: connectNodes(c.script, conn.source ?? "", conn.target ?? ""),
      }));
    },
    [updateCampaign, mode],
  );

  function addNode() {
    const rect = wrapRef.current?.getBoundingClientRect();
    const center = rect
      ? screenToFlowPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 3 })
      : { x: 0, y: 0 };
    const node = newNodeAt(center);
    patchNodes((nodes) => [...nodes, node]);
    setSelectedNodeId(node.id);
    setDrawerEdgeId(null);
    setDrawerNodeId(node.id);
  }

  function relayout() {
    updateCampaign((c) => ({
      ...c,
      script: { ...c.script, nodes: autoLayout(c.script.nodes, c.script.edges) },
    }));
    window.setTimeout(() => fitView({ padding: 0.2, duration: 200 }), 50);
  }

  const selectedNode = scriptNodes.find((n) => n.id === selectedNodeId) ?? null;
  const drawerNode = scriptNodes.find((n) => n.id === drawerNodeId) ?? null;
  const drawerEdge = scriptEdges.find((e) => e.id === drawerEdgeId) ?? null;
  const editing = mode === "edit";

  return (
    <div className="pane-left">
      <div className="canvas-bar">
        <div className="mode-toggle">
          <button className={mode === "call" ? "on" : ""} onClick={() => setMode("call")}>
            Разговор
          </button>
          <button
            className={editing ? "on" : ""}
            onClick={() => {
              setMode("edit");
            }}
          >
            Редакция
          </button>
        </div>

        <Calculator campaign={campaign} value={avgService} onChange={onAvgServiceChange} />

        <div className="spacer" />

        {editing ? (
          <>
            <button className="btn sm" onClick={addNode}>
              + Възел
            </button>
            <button className="btn sm" onClick={relayout} title="dagre подредба отляво надясно">
              Пренареди
            </button>
            <span className="dim" style={{ fontSize: 11 }}>
              двоен клик = редакция · влачи от кръгчето = връзка
            </span>
          </>
        ) : (
          <span className="dim" style={{ fontSize: 11 }}>
            {scriptNodes.length} възела · възлите са заключени
          </span>
        )}
      </div>

      <div className={`canvas ${editing ? "edit-mode" : "call-mode"}`} ref={wrapRef}>
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onNodeDoubleClick={onNodeDoubleClick}
          onNodeDragStop={onNodeDragStop}
          onEdgeClick={onEdgeClick}
          onConnect={onConnect}
          nodesDraggable={editing}
          nodesConnectable={editing}
          edgesFocusable={editing}
          elementsSelectable
          deleteKeyCode={null}
          minZoom={0.15}
          maxZoom={2}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="#1e2331" />
          <Controls showInteractive={false} />
          <MiniMap
            pannable
            zoomable
            nodeColor={(n) => colorHex((n.data as CardData | undefined)?.color)}
            maskColor="rgba(8,10,16,0.7)"
          />
        </ReactFlow>

        {editing && drawerNode ? (
          <NodeDrawer
            campaign={campaign}
            node={drawerNode}
            ctx={ctx}
            onChange={(patch) => patchNodes((nodes) => patchNode(nodes, drawerNode.id, patch))}
            onDelete={() => {
              const id = drawerNode.id;
              setDrawerNodeId(null);
              if (selectedNodeId === id) setSelectedNodeId(null);
              updateCampaign((c) => ({ ...c, script: deleteNode(c.script, id) }));
            }}
            onClose={() => setDrawerNodeId(null)}
          />
        ) : null}

        {editing && drawerEdge ? (
          <EdgeDrawer
            edge={drawerEdge}
            nodes={scriptNodes}
            onChange={(patch) =>
              updateCampaign((c) => ({
                ...c,
                script: { ...c.script, edges: patchEdge(c.script.edges, drawerEdge.id, patch) },
              }))
            }
            onDelete={() => {
              const id = drawerEdge.id;
              setDrawerEdgeId(null);
              updateCampaign((c) => ({
                ...c,
                script: { ...c.script, edges: c.script.edges.filter((e) => e.id !== id) },
              }));
            }}
            onClose={() => setDrawerEdgeId(null)}
          />
        ) : null}
      </div>

      <ReadingPane
        campaign={campaign}
        node={selectedNode}
        ctx={ctx}
        onFocusVerbatim={onFocusVerbatim}
        onSetStatus={onSetStatus}
      />
    </div>
  );
}

export function ScriptPanel(props: Props) {
  return (
    <ReactFlowProvider>
      <ScriptPanelInner {...props} />
    </ReactFlowProvider>
  );
}
