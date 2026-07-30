import type { ScriptEdge, ScriptNode } from "../types";

export function EdgeDrawer({
  edge,
  nodes,
  onChange,
  onDelete,
  onClose,
}: {
  edge: ScriptEdge;
  nodes: ScriptNode[];
  onChange: (patch: Partial<ScriptEdge>) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const title = (id: string) => nodes.find((n) => n.id === id)?.title ?? id;

  return (
    <div className="drawer" style={{ width: 380 }} onMouseDown={(e) => e.stopPropagation()}>
      <div className="d-head">
        <strong>Редакция на връзка</strong>
        <div className="spacer" />
        <button className="btn ghost sm" onClick={onClose}>
          ✕
        </button>
      </div>
      <div className="d-body col" style={{ gap: 12 }}>
        <div className="muted" style={{ fontSize: 13 }}>
          {title(edge.source)} <span className="dim">→</span> {title(edge.target)}
        </div>
        <div>
          <label className="label">Надпис</label>
          <input
            className="input"
            value={edge.label ?? ""}
            onChange={(e) => onChange({ label: e.target.value })}
          />
        </div>
        <label className="row" style={{ gap: 6 }}>
          <input
            type="checkbox"
            checked={Boolean(edge.dashed)}
            onChange={(e) => onChange({ dashed: e.target.checked })}
          />
          Прекъсната линия
        </label>
      </div>
      <div className="d-foot">
        <button className="btn danger" onClick={onDelete}>
          Изтрий връзката
        </button>
        <div className="spacer" />
        <button className="btn primary" onClick={onClose}>
          Готово
        </button>
      </div>
    </div>
  );
}
