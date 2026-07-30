import { useState } from "react";
import { useStore } from "../store";
import type { AppState } from "../types";
import { Modal, ConfirmDialog } from "./Modal";
import {
  STORAGE_WARN_BYTES,
  downloadTextFile,
  formatBytes,
  pickFile,
  readFileAsText,
} from "../lib/storage";
import { toISODate } from "../lib/dates";

export function TopBar({ onOpenSettings }: { onOpenSettings: () => void }) {
  const {
    state,
    campaign,
    bytes,
    setActiveCampaign,
    addCampaign,
    duplicateCampaign,
    replaceState,
    setNotice,
  } = useStore();
  const [naming, setNaming] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<AppState | null>(null);

  function exportJson() {
    const stamp = toISODate(new Date());
    downloadTextFile(
      `callcockpit-${stamp}.json`,
      JSON.stringify(state, null, 2),
      "application/json;charset=utf-8",
    );
  }

  async function importJson() {
    const file = await pickFile(".json,application/json");
    if (!file) return;
    try {
      const text = await readFileAsText(file);
      const parsed = JSON.parse(text) as AppState;
      if (!parsed || !Array.isArray(parsed.campaigns)) {
        setNotice("Файлът не е валиден Call Cockpit архив.");
        return;
      }
      setPendingImport(parsed);
    } catch (e) {
      setNotice(`Не мога да прочета JSON: ${String(e)}`);
    }
  }

  const pct = Math.min(100, Math.round((bytes / (5 * 1024 * 1024)) * 100));
  const warn = bytes > STORAGE_WARN_BYTES;

  return (
    <div className="topbar">
      <span className="brand">CALL COCKPIT</span>

      <select
        className="select"
        style={{ width: 250 }}
        value={campaign.id}
        onChange={(e) => setActiveCampaign(e.target.value)}
      >
        {state.campaigns.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      <button className="btn" onClick={() => setNaming("")}>
        Нова кампания
      </button>
      <button
        className="btn"
        title="Копира скрипта и настройките, без лийдовете"
        onClick={() => {
          duplicateCampaign(campaign.id);
          setNotice("Кампанията е дублирана (без лийдове).");
        }}
      >
        Дублирай кампания
      </button>
      <button className="btn" onClick={onOpenSettings}>
        Настройки
      </button>

      <div className="sep" />

      <button className="btn" onClick={exportJson}>
        Експорт JSON
      </button>
      <button className="btn" onClick={importJson}>
        Импорт JSON
      </button>

      <div className="spacer" />

      <div className={`storage-meter ${warn ? "warn" : ""}`} title="Заето място в localStorage">
        <span>{formatBytes(bytes)}</span>
        <div className="track">
          <div className="fill" style={{ width: `${pct}%` }} />
        </div>
        {warn ? <span>над 4 MB — махни снимки</span> : null}
      </div>

      {naming !== null ? (
        <Modal
          title="Нова кампания"
          size="narrow"
          onClose={() => setNaming(null)}
          footer={
            <>
              <button className="btn" onClick={() => setNaming(null)}>
                Отказ
              </button>
              <button
                className="btn primary"
                onClick={() => {
                  addCampaign(naming.trim() || "Нова кампания");
                  setNaming(null);
                }}
              >
                Създай
              </button>
            </>
          }
        >
          <label className="label">Име</label>
          <input
            className="input"
            autoFocus
            value={naming}
            placeholder="напр. Автомивки — Пловдив"
            onChange={(e) => setNaming(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                addCampaign(naming.trim() || "Нова кампания");
                setNaming(null);
              }
            }}
          />
          <p className="dim" style={{ fontSize: 12 }}>
            Празен скрипт, стандартен набор статуси, без каденция.
          </p>
        </Modal>
      ) : null}

      {pendingImport ? (
        <ConfirmDialog
          title="Импорт на JSON"
          message={`Архивът съдържа ${pendingImport.campaigns.length} кампании. Това ЗАМЕНЯ цялото текущо състояние.`}
          confirmLabel="Замени"
          onCancel={() => setPendingImport(null)}
          onConfirm={() => {
            replaceState(pendingImport);
            setPendingImport(null);
            setNotice("Състоянието е възстановено от архива.");
          }}
        />
      ) : null}
    </div>
  );
}
