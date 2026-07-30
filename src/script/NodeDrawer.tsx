import { useRef, useState } from "react";
import type { Campaign, NodeAction, ScriptNode } from "../types";
import { PALETTE, PALETTE_NAMES, colorHex } from "../lib/palette";
import { fileToDownscaledDataUrl, imageFromClipboard } from "../lib/image";
import { pickFile } from "../lib/storage";
import { ConfirmDialog } from "../components/Modal";
import type { TokenContext } from "../lib/placeholders";

export function NodeDrawer({
  campaign,
  node,
  ctx,
  onChange,
  onDelete,
  onClose,
}: {
  campaign: Campaign;
  node: ScriptNode;
  ctx: TokenContext;
  onChange: (patch: Partial<ScriptNode>) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [imgError, setImgError] = useState<string | null>(null);

  const groups = Array.from(new Set(campaign.script.nodes.map((n) => n.group))).filter(Boolean);

  function insertToken(token: string) {
    const el = bodyRef.current;
    const snippet = `[${token}]`;
    if (!el) {
      onChange({ body: node.body + snippet });
      return;
    }
    const start = el.selectionStart ?? node.body.length;
    const end = el.selectionEnd ?? start;
    const next = node.body.slice(0, start) + snippet + node.body.slice(end);
    onChange({ body: next });
    requestAnimationFrame(() => {
      el.focus();
      const caret = start + snippet.length;
      el.setSelectionRange(caret, caret);
    });
  }

  async function setImageFrom(file: File | Blob) {
    setImgError(null);
    try {
      const dataUrl = await fileToDownscaledDataUrl(file);
      onChange({ imageDataUrl: dataUrl });
    } catch (e) {
      setImgError(String(e));
    }
  }

  function updateAction(index: number, patch: Partial<NodeAction>) {
    const actions = [...(node.actions ?? [])];
    actions[index] = { ...actions[index], ...patch };
    onChange({ actions });
  }

  function removeAction(index: number) {
    const actions = (node.actions ?? []).filter((_, i) => i !== index);
    onChange({ actions: actions.length ? actions : undefined });
  }

  return (
    <div className="drawer" onMouseDown={(e) => e.stopPropagation()}>
      <div className="d-head">
        <strong>Редакция на възел</strong>
        <span className="dim mono" style={{ fontSize: 11 }}>
          {node.id}
        </span>
        <div className="spacer" />
        <button className="btn ghost sm" onClick={onClose}>
          ✕
        </button>
      </div>

      <div className="d-body col" style={{ gap: 12 }}>
        <div>
          <label className="label">Заглавие</label>
          <input
            className="input"
            value={node.title}
            onChange={(e) => onChange({ title: e.target.value })}
          />
        </div>

        <div>
          <label className="label">Подсказка (малък текст над тялото)</label>
          <input
            className="input"
            value={node.hint ?? ""}
            onChange={(e) => onChange({ hint: e.target.value })}
          />
        </div>

        <div>
          <label className="label">Текст</label>
          <textarea
            ref={bodyRef}
            className="textarea"
            rows={12}
            value={node.body}
            onChange={(e) => onChange({ body: e.target.value })}
          />
          <div className="dim" style={{ fontSize: 11, marginTop: 4 }}>
            Налични токени — кликни, за да вмъкнеш:
          </div>
          <div className="token-chips">
            {ctx.available.map((t) => (
              <span key={t} className="token-chip" onClick={() => insertToken(t)}>
                [{t}]
              </span>
            ))}
          </div>
        </div>

        <div className="row" style={{ alignItems: "flex-end", gap: 12 }}>
          <div style={{ width: 170 }}>
            <label className="label">Група</label>
            <input
              className="input"
              list="node-groups"
              value={node.group}
              onChange={(e) => onChange({ group: e.target.value })}
            />
            <datalist id="node-groups">
              {groups.map((g) => (
                <option key={g} value={g} />
              ))}
            </datalist>
          </div>
          <div className="grow">
            <label className="label">Цвят</label>
            <div className="swatches">
              {PALETTE_NAMES.map((name) => (
                <div
                  key={name}
                  className={`swatch ${node.color === name ? "on" : ""}`}
                  style={{ background: colorHex(name) }}
                  title={PALETTE[name].label}
                  onClick={() => onChange({ color: name })}
                />
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="label">Снимка</label>
          {node.imageDataUrl ? (
            <div className="col" style={{ gap: 6 }}>
              <img className="thumb" src={node.imageDataUrl} alt="" />
              <div className="row">
                <button
                  className="btn sm danger"
                  onClick={() => onChange({ imageDataUrl: undefined })}
                >
                  Махни снимката
                </button>
              </div>
            </div>
          ) : (
            <div
              className="dropzone"
              tabIndex={0}
              onPaste={(e) => {
                const file = imageFromClipboard(e.nativeEvent);
                if (file) {
                  e.preventDefault();
                  void setImageFrom(file);
                }
              }}
            >
              Кликни тук и натисни Ctrl+V, за да поставиш снимка
              <div style={{ marginTop: 6 }}>
                <button
                  className="btn sm"
                  onClick={async () => {
                    const file = await pickFile("image/*");
                    if (file) void setImageFrom(file);
                  }}
                >
                  Избери файл…
                </button>
              </div>
            </div>
          )}
          {imgError ? (
            <div className="dim" style={{ color: "var(--danger)", fontSize: 12 }}>
              {imgError}
            </div>
          ) : null}
        </div>

        <div>
          <label className="label">Бутони в панела за четене</label>
          <div className="col" style={{ gap: 6 }}>
            {(node.actions ?? []).map((a, i) => (
              <div key={i} className="row" style={{ gap: 5 }}>
                <select
                  className="select"
                  style={{ width: 130 }}
                  value={a.kind}
                  onChange={(e) =>
                    updateAction(i, { kind: e.target.value as NodeAction["kind"] })
                  }
                >
                  <option value="focusVerbatim">вербатим фокус</option>
                  <option value="setStatus">задай статус</option>
                </select>
                {a.kind === "setStatus" ? (
                  <select
                    className="select"
                    style={{ width: 150 }}
                    value={a.statusId ?? ""}
                    onChange={(e) => updateAction(i, { statusId: e.target.value })}
                  >
                    <option value="">— статус —</option>
                    {campaign.statuses.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                ) : null}
                <input
                  className="input grow"
                  placeholder="надпис"
                  value={a.label}
                  onChange={(e) => updateAction(i, { label: e.target.value })}
                />
                <button className="btn sm danger" onClick={() => removeAction(i)}>
                  ✕
                </button>
              </div>
            ))}
            <div className="row">
              <button
                className="btn sm"
                onClick={() =>
                  onChange({
                    actions: [
                      ...(node.actions ?? []),
                      { kind: "focusVerbatim", label: "→ логни вербатим" },
                    ],
                  })
                }
              >
                + вербатим бутон
              </button>
              <button
                className="btn sm"
                onClick={() =>
                  onChange({
                    actions: [
                      ...(node.actions ?? []),
                      {
                        kind: "setStatus",
                        statusId: campaign.statuses[0]?.id ?? "",
                        label: "Задай статус",
                      },
                    ],
                  })
                }
              >
                + статус бутон
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="d-foot">
        <button className="btn danger" onClick={() => setConfirmDelete(true)}>
          Изтрий възела
        </button>
        <div className="spacer" />
        <button className="btn primary" onClick={onClose}>
          Готово
        </button>
      </div>

      {confirmDelete ? (
        <ConfirmDialog
          title="Изтриване на възел"
          message={`Сигурен ли си, че искаш да изтриеш „${node.title}"? Връзките към него също изчезват.`}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => {
            setConfirmDelete(false);
            onDelete();
          }}
        />
      ) : null}
    </div>
  );
}
