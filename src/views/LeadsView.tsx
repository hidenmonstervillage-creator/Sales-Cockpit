import { useMemo, useState } from "react";
import type { Campaign, Lead } from "../types";
import { useStore } from "../store";
import { StatusChip, StatusPicker } from "../components/StatusChip";
import { Modal, ConfirmDialog } from "../components/Modal";
import { exportLeadsCsv, parseCsvText } from "../lib/csv";
import type { ParsedCsv } from "../lib/csv";
import { downloadTextFile, pickFile, readFileAsText } from "../lib/storage";
import { ImportCsvModal } from "./ImportCsvModal";
import { uid } from "../lib/id";
import { formatBgShortISO, toISODate } from "../lib/dates";
import { statusLabel } from "../lib/cadence";
import { comparePriorityValues, priorityFieldKey } from "../lib/priority";

const MAX_FILTER_VALUES = 15;

function fieldText(lead: Lead, key: string): string {
  const v = lead.fields[key];
  return v === undefined || v === null ? "" : String(v);
}

function emptyLead(campaign: Campaign): Lead {
  const lead: Lead = {
    id: uid("lead"),
    fields: {},
    prep: {},
    статус: campaign.statuses[0]?.id ?? "",
    calls: [],
  };
  for (const f of campaign.leadFields) lead.fields[f.key] = "";
  for (const f of campaign.prepFields) lead.prep[f.key] = "";
  return lead;
}

export function LeadsView({ onOpenLead }: { onOpenLead: (id: string) => void }) {
  const { campaign, updateCampaign, setNotice } = useStore();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [fieldFilters, setFieldFilters] = useState<Record<string, string>>({});
  const [sortKey, setSortKey] = useState<string>("");
  const [sortDir, setSortDir] = useState<1 | -1>(1);
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [adding, setAdding] = useState<Lead | null>(null);
  const [deleting, setDeleting] = useState<Lead | null>(null);

  const tableFields = campaign.leadFields.filter((f) => f.showInTable);

  // Any short-valued text column becomes a dropdown filter (Приоритет for AutoClick).
  const filterable = useMemo(() => {
    const out: { key: string; label: string; values: string[] }[] = [];
    for (const f of campaign.leadFields) {
      if (f.type !== "text" || !f.showInTable) continue;
      const values = Array.from(
        new Set(campaign.leads.map((l) => fieldText(l, f.key).trim()).filter(Boolean)),
      ).sort((a, b) => a.localeCompare(b, "bg"));
      if (values.length > 0 && values.length <= MAX_FILTER_VALUES) {
        out.push({ key: f.key, label: f.label, values });
      }
    }
    return out;
  }, [campaign.leadFields, campaign.leads]);

  const statusValues = useMemo(() => {
    const known = campaign.statuses.map((s) => s.id);
    const raw = Array.from(
      new Set(campaign.leads.map((l) => l.статус).filter((v) => v && !known.includes(v))),
    );
    return [...campaign.statuses.map((s) => ({ value: s.id, label: s.label })), ...raw.map((v) => ({ value: v, label: `${v} (от CSV)` }))];
  }, [campaign.statuses, campaign.leads]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = campaign.leads.filter((lead) => {
      if (statusFilter && lead.статус !== statusFilter) return false;
      for (const [key, value] of Object.entries(fieldFilters)) {
        if (value && fieldText(lead, key).trim() !== value) return false;
      }
      if (!q) return true;
      const haystack = [
        ...campaign.leadFields.map((f) => fieldText(lead, f.key)),
        statusLabel(campaign, lead.статус),
        lead.nextAction?.text ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
    if (sortKey) {
      const def = campaign.leadFields.find((f) => f.key === sortKey);
      list = [...list].sort((a, b) => {
        if (sortKey === "__status") {
          return statusLabel(campaign, a.статус).localeCompare(
            statusLabel(campaign, b.статус),
            "bg",
          ) * sortDir;
        }
        if (sortKey === "__next") {
          return (a.nextAction?.date ?? "").localeCompare(b.nextAction?.date ?? "") * sortDir;
        }
        if (def?.type === "number") {
          return ((Number(a.fields[sortKey]) || 0) - (Number(b.fields[sortKey]) || 0)) * sortDir;
        }
        // „Приоритет" needs semantic order (ВИСОК → СРЕДЕН → НИСЪК), not alphabetical.
        if (sortKey === priorityFieldKey(campaign)) {
          return comparePriorityValues(fieldText(a, sortKey), fieldText(b, sortKey)) * sortDir;
        }
        return fieldText(a, sortKey).localeCompare(fieldText(b, sortKey), "bg") * sortDir;
      });
    }
    return list;
  }, [campaign, query, statusFilter, fieldFilters, sortKey, sortDir]);

  function toggleSort(key: string) {
    if (sortKey === key) setSortDir((d) => (d === 1 ? -1 : 1));
    else {
      setSortKey(key);
      setSortDir(1);
    }
  }

  async function importCsv() {
    const file = await pickFile(".csv,text/csv");
    if (!file) return;
    try {
      const text = await readFileAsText(file);
      const result = parseCsvText(text);
      if (result.headers.length === 0) {
        setNotice("Файлът не изглежда като CSV с заглавен ред.");
        return;
      }
      setParsed(result);
    } catch (e) {
      setNotice(`Грешка при четене на CSV: ${String(e)}`);
    }
  }

  function exportCsv() {
    const stamp = toISODate(new Date());
    const safe = campaign.name.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");
    downloadTextFile(`${safe || "leads"}-${stamp}.csv`, exportLeadsCsv(campaign), "text/csv;charset=utf-8");
  }

  const sortArrow = (key: string) => (sortKey === key ? (sortDir === 1 ? " ▲" : " ▼") : "");

  return (
    <div className="view">
      <div className="toolbar">
        <input
          className="input"
          style={{ width: 260 }}
          placeholder="Търси навсякъде…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="select"
          style={{ width: 190 }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Всички статуси</option>
          {statusValues.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        {filterable.map((f) => (
          <select
            key={f.key}
            className="select"
            style={{ width: 160 }}
            value={fieldFilters[f.key] ?? ""}
            onChange={(e) =>
              setFieldFilters((prev) => ({ ...prev, [f.key]: e.target.value }))
            }
          >
            <option value="">Всички: {f.label}</option>
            {f.values.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        ))}
        <div className="spacer" />
        <span className="dim">
          {rows.length} / {campaign.leads.length}
        </span>
        <button className="btn" onClick={() => setAdding(emptyLead(campaign))}>
          Добави лийд
        </button>
        <button className="btn" onClick={importCsv}>
          Импорт CSV
        </button>
        <button className="btn" onClick={exportCsv} disabled={campaign.leads.length === 0}>
          Експорт CSV
        </button>
      </div>

      <div className="tbl-wrap scroller">
        <table className="tbl">
          <thead>
            <tr>
              {tableFields.map((f) => (
                <th key={f.key} onClick={() => toggleSort(f.key)}>
                  {f.label}
                  {sortArrow(f.key)}
                </th>
              ))}
              <th onClick={() => toggleSort("__status")}>Статус{sortArrow("__status")}</th>
              <th onClick={() => toggleSort("__next")}>Следващо{sortArrow("__next")}</th>
              <th className="plain" style={{ width: 34 }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((lead) => (
              <tr key={lead.id} onClick={() => onOpenLead(lead.id)}>
                {tableFields.map((f) => (
                  <td key={f.key} title={fieldText(lead, f.key)}>
                    {f.primary ? <strong>{fieldText(lead, f.key)}</strong> : fieldText(lead, f.key)}
                  </td>
                ))}
                <td>
                  <StatusChip campaign={campaign} value={lead.статус} />
                </td>
                <td className="dim">
                  {lead.nextAction?.date ? (
                    <>
                      {formatBgShortISO(lead.nextAction.date)}
                      {lead.nextAction.text ? ` — ${lead.nextAction.text}` : ""}
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td>
                  <button
                    className="btn ghost sm"
                    title="Изтрий лийда"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleting(lead);
                    }}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? (
          <div className="empty">
            {campaign.leads.length === 0
              ? "Няма лийдове. Импортирай CSV или добави ръчно."
              : "Нищо не отговаря на филтрите."}
          </div>
        ) : null}
      </div>

      {parsed ? (
        <ImportCsvModal
          campaign={campaign}
          parsed={parsed}
          onClose={(imported) => {
            setParsed(null);
            if (imported > 0) setNotice(`Импортирани ${imported} лийда.`);
          }}
        />
      ) : null}

      {adding ? (
        <AddLeadModal
          campaign={campaign}
          draft={adding}
          onChange={setAdding}
          onCancel={() => setAdding(null)}
          onSave={() => {
            const lead = adding;
            updateCampaign((c) => ({ ...c, leads: [...c.leads, lead] }));
            setAdding(null);
          }}
        />
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title="Изтриване на лийд"
          message="Лийдът и цялата му история изчезват. Сигурен ли си?"
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            const id = deleting.id;
            setDeleting(null);
            updateCampaign((c) => ({ ...c, leads: c.leads.filter((l) => l.id !== id) }));
          }}
        />
      ) : null}
    </div>
  );
}

function AddLeadModal({
  campaign,
  draft,
  onChange,
  onCancel,
  onSave,
}: {
  campaign: Campaign;
  draft: Lead;
  onChange: (lead: Lead) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  function set(key: string, value: string) {
    onChange({ ...draft, fields: { ...draft.fields, [key]: value } });
  }
  return (
    <Modal
      title="Нов лийд"
      onClose={onCancel}
      footer={
        <>
          <button className="btn" onClick={onCancel}>
            Отказ
          </button>
          <button className="btn primary" onClick={onSave}>
            Запиши
          </button>
        </>
      }
    >
      <div className="col" style={{ gap: 10 }}>
        {campaign.leadFields.map((f) => (
          <div key={f.key}>
            <label className="label">{f.label}</label>
            {f.type === "longtext" ? (
              <textarea
                className="textarea"
                rows={2}
                value={String(draft.fields[f.key] ?? "")}
                onChange={(e) => set(f.key, e.target.value)}
              />
            ) : (
              <input
                className="input"
                type={f.type === "number" ? "number" : "text"}
                value={String(draft.fields[f.key] ?? "")}
                onChange={(e) => set(f.key, e.target.value)}
              />
            )}
          </div>
        ))}
        <div>
          <label className="label">Статус</label>
          <StatusPicker
            campaign={campaign}
            value={draft.статус}
            onPick={(id) => onChange({ ...draft, статус: id })}
          />
        </div>
      </div>
    </Modal>
  );
}
