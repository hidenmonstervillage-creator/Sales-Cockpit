import { Handle, Position } from "@xyflow/react";
import type { Node, NodeProps } from "@xyflow/react";
import { colorHex, colorTint } from "../lib/palette";

export interface CardData {
  title: string;
  group: string;
  color: string;
  preview: string;
  hasImage: boolean;
  hasActions: boolean;
  active: boolean;
  [key: string]: unknown;
}

export type CardNode = Node<CardData, "card">;

export function ScriptNodeCard({ data }: NodeProps<CardNode>) {
  const hex = colorHex(data.color);
  return (
    <div
      className={`rf-card ${data.active ? "on" : ""}`}
      style={{ borderLeftColor: hex, background: data.active ? colorTint(data.color, 0.2) : undefined }}
    >
      <Handle type="target" position={Position.Left} />
      <div className="grp" style={{ color: hex }}>
        {data.group}
      </div>
      <div className="ttl">{data.title}</div>
      <div className="prev">{data.preview}</div>
      {data.hasImage || data.hasActions ? (
        <div className="badges">
          {data.hasImage ? <span>снимка</span> : null}
          {data.hasActions ? <span>бутон</span> : null}
        </div>
      ) : null}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
