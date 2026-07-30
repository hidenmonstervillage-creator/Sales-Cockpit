import { useState } from "react";
import type { ColumnMapping, ParsedCsv } from "../lib/csv";
import { META_COLUMNS, autoMapColumns, buildLeadsFromCsv } from "../lib/csv";
import type { Campaign } from "../types";
import { Modal } from "../components/Modal";
import { useStore } from "../store";
import { slugKey } from "../lib/id";

const NEW_FIELD = "__new__";
const SKIP = "__skip__";

export function ImportCsvModal({
  campaign,
  parsed,
  onClose,
}: {
  campaign: Campaign;
  parsed: ParsedCsv;
  onClose: (imported: number) => void;
}) {
  const { updateCampaign } = useStore();
  const [mappings, setMappings] = useState<ColumnMapping[]>(() =>
    autoMapColumns(campaign, parsed.headers),
  );
  const [replace, setReplace] = useState(false);

  function selectValue(m: ColumnMapping): string {
    switch (m.target.kind) {
      case "field":
        return `f:${m.target.key}`;
      case "meta":
        return `m:${m.target.name}`;
      case "new":
        return NEW_FIELD;
      default:
        return SKIP;
    }
  }

  function setTarget(index: number, raw: string) {
    setMappings((list) =>
      list.map((m, i) => {
        if (i !== index) return m;
        if (raw === SKIP) return { ...m, target: { kind: "skip" } };
        if (raw === NEW_FIELD) return { ...m, target: { kind: "new", label: m.header } };
        if (raw.startsWith("f:")) return { ...m, target: { kind: "field", key: raw.slice(2) } };
        if (raw.startsWith("m:")) return { ...m, target: { kind: "meta", name: raw.slice(2) } };
        return m;
      }),
    );
  }

  function doImport() {
    const count = parsed.rows.length;
    updateCampaign((c) => {
      const leadFields = [...c.leadFields];
      const resolved: ColumnMapping[] = mappings.map((m) => {
        if (m.target.kind !== "new") return m;
        const key = slugKey(
          m.target.label,
          leadFields.map((f) => f.key),
        );
        leadFields.push({ key, label: m.target.label, type: "text", showInTable: true });
        return { ...m, target: { kind: "field", key } };
      });
      const withFields: Campaign = { ...c, leadFields };
      const leads = buildLeadsFromCsv(withFields, parsed, resolved);
      return { ...withFields, leads: replace ? leads : [...withFields.leads, ...leads] };
    });
    onClose(count);
  }

  const unmapped = mappings.filter((m) => m.target.kind === "skip").length;

  return (
    <Modal
      title="Импорт на лийдове от CSV"
      size="wide"
      onClose={() => onClose(0)}
      footer={
        <>
          <label className="row" style={{ marginRight: "auto", gap: 6 }}>
            <input
              type="checkbox"
              checked={replace}
              onChange={(e) => setReplace(e.target.checked)}
            />
            Замени всички съществуващи лийдове ({campaign.leads.length})
          </label>
          <button className="btn" onClick={() => onClose(0)}>
            Отказ
          </button>
          <button className="btn primary" onClick={doImport} disabled={parsed.rows.length === 0}>
            Импортирай {parsed.rows.length} реда
          </button>
        </>
      }
    >
      <p className="muted" style={{ marginTop: 0 }}>
        {parsed.headers.length} колони · {parsed.rows.length} реда.
        {unmapped > 0 ? ` ${unmapped} колони ще бъдат пропуснати.` : " Всички колони са разпознати."}
      </p>
      <div className="tbl-wrap" style={{ maxHeight: 420 }}>
        <table className="tbl">
          <thead>
            <tr>
              <th className="plain">Колона в CSV</th>
              <th className="plain">Първа стойност</th>
              <th className="plain">Отива в</th>
            </tr>
          </thead>
          <tbody>
            {mappings.map((m, i) => (
              <tr key={m.header} style={{ cursor: "default" }}>
                <td>
                  <strong>{m.header}</strong>
                  {m.auto ? null : (
                    <span className="dim" style={{ marginLeft: 6, fontSize: 11 }}>
                      непознато
                    </span>
                  )}
                </td>
                <td className="dim">{String(parsed.rows[0]?.[m.header] ?? "")}</td>
                <td>
                  <select
                    className="select"
                    value={selectValue(m)}
                    onChange={(e) => setTarget(i, e.target.value)}
                  >
                    <option value={SKIP}>— пропусни —</option>
                    <option value={NEW_FIELD}>+ ново поле „{m.header}"</option>
                    {campaign.leadFields.map((f) => (
                      <option key={f.key} value={`f:${f.key}`}>
                        {f.label}
                      </option>
                    ))}
                    {META_COLUMNS.map((name) => (
                      <option key={name} value={`m:${name}`}>
                        {name}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}
