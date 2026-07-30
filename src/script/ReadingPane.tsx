import type { Campaign, ScriptNode } from "../types";
import type { TokenContext } from "../lib/placeholders";
import { PlaceholderText } from "../components/PlaceholderText";
import { colorHex } from "../lib/palette";
import { findStatus } from "../lib/cadence";

/**
 * The bottom ~40% of the left panel. Renders the selected node's full body
 * with placeholders resolved. Everything is local data — zero latency.
 */
export function ReadingPane({
  campaign,
  node,
  ctx,
  onFocusVerbatim,
  onSetStatus,
  onGoToNode,
}: {
  campaign: Campaign;
  node: ScriptNode | null;
  ctx: TokenContext;
  onFocusVerbatim: () => void;
  onSetStatus: (statusId: string) => void;
  onGoToNode: (nodeId: string) => void;
}) {
  // Persistent jump to the close, shown on every node except the close itself.
  const closeNode = campaign.script.nodes.find((n) => n.id === campaign.closeNodeId);
  const closeButton =
    closeNode && closeNode.id !== node?.id ? (
      <button
        className="btn close-jump"
        onClick={() => onGoToNode(closeNode.id)}
        title={closeNode.title}
      >
        → {closeNode.group}
      </button>
    ) : null;

  if (!node) {
    return (
      <div className="reader">
        <div className="reader-head">
          <span className="dim">Избери възел от схемата</span>
          <div className="spacer" />
          {closeButton}
        </div>
        <div className="reader-scroll">
          <div className="dim" style={{ fontSize: 15 }}>
            Кликни върху възел горе, за да се появи целият текст тук.
          </div>
        </div>
      </div>
    );
  }

  // A setStatus action whose status no longer exists simply does not render.
  const actions = (node.actions ?? []).filter(
    (a) => a.kind !== "setStatus" || Boolean(findStatus(campaign, a.statusId)),
  );

  return (
    <div className="reader">
      <div className="reader-head">
        <span
          className="chip"
          style={{ borderColor: colorHex(node.color), color: colorHex(node.color) }}
        >
          {node.group}
        </span>
        <span className="ttl">{node.title}</span>
        <div className="spacer" />
        {closeButton}
      </div>
      <div className="reader-scroll">
        <div className="grow">
          {node.hint ? <div className="reader-hint">{node.hint}</div> : null}
          <PlaceholderText text={node.body} ctx={ctx} className="reader-body" />
          {actions.length > 0 ? (
            <div className="reader-actions">
              {actions.map((a, i) =>
                a.kind === "focusVerbatim" ? (
                  <button key={i} className="btn primary" onClick={onFocusVerbatim}>
                    {a.label}
                  </button>
                ) : (
                  <button
                    key={i}
                    className="btn"
                    onClick={() => a.statusId && onSetStatus(a.statusId)}
                  >
                    {a.label}
                  </button>
                ),
              )}
            </div>
          ) : null}
        </div>
        {node.imageDataUrl ? (
          <div className="reader-img">
            <img src={node.imageDataUrl} alt="" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
