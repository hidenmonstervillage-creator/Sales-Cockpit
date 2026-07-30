import { useEffect, useMemo, useRef, useState } from "react";
import type { CallLog, Campaign, Lead } from "../types";
import { useStore } from "../store";
import { ScriptPanel } from "../script/ScriptPanel";
import { StatusChip, StatusPicker } from "../components/StatusChip";
import { breakevenCalls, buildTokenContext } from "../lib/placeholders";
import {
  cadencePreview,
  findStatus,
  maxPickableDate,
  suggestNext,
} from "../lib/cadence";
import {
  daysWord,
  diffDays,
  formatBgShortISO,
  formatDotShortISO,
  formatStampBg,
  fromDatetimeLocal,
  toDatetimeLocal,
  toISODate,
  todayISO,
} from "../lib/dates";
import { uid } from "../lib/id";

function primaryName(campaign: Campaign, lead: Lead): string {
  const primary = campaign.leadFields.find((f) => f.primary) ?? campaign.leadFields[0];
  const value = primary ? lead.fields[primary.key] : "";
  return String(value || "").trim() || "(без име)";
}

export function CallView({
  lead,
  onPickLead,
}: {
  lead: Lead | null;
  onPickLead: (id: string) => void;
}) {
  const { campaign, updateLead } = useStore();
  const today = todayISO();

  const [when, setWhen] = useState(() => toDatetimeLocal(new Date()));
  const [statusValue, setStatusValue] = useState<string>(lead?.статус ?? "");
  const [prepDraft, setPrepDraft] = useState<Record<string, string>>({});
  const [вербатим, setВербатим] = useState("");
  const [следващоДействие, setСледващоДействие] = useState("");
  const [следващаДата, setСледващаДата] = useState("");
  const [бележки, setБележки] = useState("");
  const [cadenceMsg, setCadenceMsg] = useState<string | null>(null);
  const [histOpen, setHistOpen] = useState(true);
  const [saved, setSaved] = useState(false);

  const verbatimRef = useRef<HTMLTextAreaElement | null>(null);
  const leadId = lead?.id ?? null;

  // Fresh form whenever the open lead changes.
  useEffect(() => {
    setWhen(toDatetimeLocal(new Date()));
    setStatusValue(lead?.статус ?? campaign.statuses[0]?.id ?? "");
    setPrepDraft({ ...(lead?.prep ?? {}) });
    setВербатим("");
    setБележки("");
    setСледващоДействие(lead?.nextAction?.text ?? "");
    setСледващаДата(lead?.nextAction?.date ?? "");
    setCadenceMsg(null);
    setSaved(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId, campaign.id]);

  const avg = lead?.среднаУслуга;
  const breakeven = breakevenCalls(campaign.calc.investment, avg);

  const ctx = useMemo(() => buildTokenContext(campaign, lead, avg), [campaign, lead, avg]);

  function setAvg(v: number | undefined) {
    if (!lead) return;
    updateLead(lead.id, (l) => ({ ...l, среднаУслуга: v }));
  }

  function applyStatus(id: string) {
    setStatusValue(id);
    const s = suggestNext(campaign, lead, id, today);
    setСледващоДействие(s.text);
    setСледващаДата(s.date);
    setCadenceMsg(s.message ?? null);
  }

  function clampDate(value: string): string {
    const max = maxPickableDate(campaign);
    if (max && value && diffDays(value, max) > 0) return max;
    return value;
  }

  function setPrepValue(key: string, value: string) {
    setPrepDraft((p) => ({ ...p, [key]: value }));
    if (lead) updateLead(lead.id, (l) => ({ ...l, prep: { ...l.prep, [key]: value } }));
  }

  function saveCall() {
    if (!lead) return;
    const timestamp = fromDatetimeLocal(when);
    const status = findStatus(campaign, statusValue);
    const call: CallLog = {
      id: uid("call"),
      timestamp,
      статус: statusValue,
      prep: { ...prepDraft },
      среднаУслуга: avg,
      breakeven: breakeven ?? undefined,
      вербатим,
      следващоДействие,
      следващаДата,
      бележки,
    };
    updateLead(lead.id, (l) => {
      const next: Lead = {
        ...l,
        calls: [...l.calls, call],
        статус: statusValue,
        lastTouch: timestamp,
        prep: { ...l.prep, ...prepDraft },
        среднаУслуга: avg,
      };
      if (status?.triggersCadence && !l.anchorDate) {
        next.anchorDate = toISODate(new Date(timestamp));
      }
      next.nextAction =
        status?.closed || (!следващоДействие.trim() && !следващаДата)
          ? undefined
          : { text: следващоДействие, date: следващаДата };
      return next;
    });
    setВербатим("");
    setБележки("");
    setWhen(toDatetimeLocal(new Date()));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  }

  const deadlineDays = campaign.deadline ? diffDays(campaign.deadline, today) : null;
  const ladder = cadencePreview(campaign, lead, today);
  const nonClosedLeads = campaign.leads;

  const linkFields = campaign.leadFields.filter((f) => f.type === "url");
  const telField = campaign.leadFields.find((f) => f.type === "tel");
  const otherHeadFields = campaign.leadFields.filter(
    (f) => f.showInTable && !f.primary && f.type !== "tel" && f.type !== "url",
  );

  return (
    <div className="call">
      <div className="call-head">
        {lead ? (
          <>
            <span className="firm">{primaryName(campaign, lead)}</span>
            {otherHeadFields.map((f) => {
              const v = String(lead.fields[f.key] ?? "").trim();
              if (!v) return null;
              return (
                <span className="meta" key={f.key}>
                  {v}
                </span>
              );
            })}
            {telField ? (
              (() => {
                const tel = String(lead.fields[telField.key] ?? "").trim();
                return tel ? (
                  <a className="tel" href={`tel:${tel.replace(/\s+/g, "")}`}>
                    {tel}
                  </a>
                ) : null;
              })()
            ) : null}
            {linkFields.map((f) => {
              const v = String(lead.fields[f.key] ?? "").trim();
              if (!v) return null;
              const href = /^https?:\/\//i.test(v) ? v : `https://${v}`;
              return (
                <a key={f.key} href={href} target="_blank" rel="noreferrer">
                  {f.label}
                </a>
              );
            })}
            <StatusChip campaign={campaign} value={lead.статус} />
          </>
        ) : (
          <span className="muted">Няма избран лийд</span>
        )}

        <div className="spacer" />

        <select
          className="select"
          style={{ width: 240 }}
          value={lead?.id ?? ""}
          onChange={(e) => onPickLead(e.target.value)}
        >
          <option value="">— избери лийд —</option>
          {nonClosedLeads.map((l) => (
            <option key={l.id} value={l.id}>
              {primaryName(campaign, l)}
            </option>
          ))}
        </select>

        {deadlineDays !== null ? (
          <span className={`countdown ${deadlineDays > 14 ? "calm" : ""}`}>
            {deadlineDays < 0
              ? `срокът мина (${formatDotShortISO(campaign.deadline!)})`
              : `${daysWord(deadlineDays)} до ${formatDotShortISO(campaign.deadline!)}`}
          </span>
        ) : null}
      </div>

      <div className="call-body">
        <ScriptPanel
          campaign={campaign}
          ctx={ctx}
          avgService={avg}
          onAvgServiceChange={setAvg}
          onFocusVerbatim={() => {
            verbatimRef.current?.focus();
            verbatimRef.current?.scrollIntoView({ block: "center" });
          }}
          onSetStatus={applyStatus}
        />

        <div className="pane-right">
          {!lead ? (
            <div className="empty">
              Избери лийд от таблицата „Лийдове" или от списъка горе.
              <br />
              Схемата вляво работи и без избран лийд — токените остават неразрешени.
            </div>
          ) : (
            <>
              <div className="block">
                <div className="head">Подготовка</div>
                <div className="body col" style={{ gap: 8 }}>
                  {campaign.prepFields.length === 0 ? (
                    <span className="dim">
                      Няма полета за подготовка — добави ги в Настройки.
                    </span>
                  ) : null}
                  {campaign.prepFields.map((f) => (
                    <div key={f.key}>
                      <label className="label">{f.label}</label>
                      <input
                        className="input"
                        value={prepDraft[f.key] ?? ""}
                        onChange={(e) => setPrepValue(f.key, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="block">
                <div className="head">Лог на обаждането</div>
                <div className="body col" style={{ gap: 10 }}>
                  <div className="two">
                    <div>
                      <label className="label">Дата / час</label>
                      <input
                        className="input"
                        type="datetime-local"
                        value={when}
                        onChange={(e) => setWhen(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="label">Средна услуга ({campaign.calc.label})</label>
                      <div className="row">
                        <input
                          className="input narrow"
                          type="number"
                          min={0}
                          step={10}
                          value={avg ?? ""}
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (raw === "") setAvg(undefined);
                            else {
                              const n = Number(raw);
                              setAvg(Number.isNaN(n) ? undefined : n);
                            }
                          }}
                        />
                        <span className="inline-out">
                          {breakeven === null ? "—" : `${breakeven} обаждания до нула`}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="label">Статус</label>
                    <StatusPicker campaign={campaign} value={statusValue} onPick={applyStatus} />
                  </div>

                  <div>
                    <label className="label">Какво трябва да се случи? (вербатим)</label>
                    <textarea
                      ref={verbatimRef}
                      className="textarea"
                      rows={3}
                      value={вербатим}
                      onChange={(e) => setВербатим(e.target.value)}
                      placeholder="Дословно, с неговите думи."
                    />
                  </div>

                  <div className="two">
                    <div>
                      <label className="label">Следващо действие</label>
                      <input
                        className="input"
                        value={следващоДействие}
                        onChange={(e) => setСледващоДействие(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="label">Следваща дата</label>
                      <input
                        className="input"
                        type="date"
                        value={следващаДата}
                        max={maxPickableDate(campaign)}
                        onChange={(e) => setСледващаДата(clampDate(e.target.value))}
                      />
                    </div>
                  </div>
                  {cadenceMsg ? <div className="suggestion">{cadenceMsg}</div> : null}
                  {ladder.length > 0 ? (
                    <div className="ladder">
                      {ladder.map((s, i) => (
                        <span
                          key={i}
                          className={s.beyond ? "beyond" : s.past ? "done" : undefined}
                        >
                          {formatBgShortISO(s.date)} — {s.text}
                          {s.beyond ? " (след срока)" : ""}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <div>
                    <label className="label">Бележки</label>
                    <textarea
                      className="textarea"
                      rows={2}
                      value={бележки}
                      onChange={(e) => setБележки(e.target.value)}
                    />
                  </div>

                  <div className="row">
                    <button className="btn go" onClick={saveCall}>
                      Запиши обаждането
                    </button>
                    {saved ? <span className="inline-out">записано ✓</span> : null}
                  </div>
                </div>
              </div>

              <div className="block">
                <div className="head click" onClick={() => setHistOpen((v) => !v)}>
                  <span>{histOpen ? "▾" : "▸"}</span> История
                  <span className="dim">({lead.calls.length})</span>
                </div>
                {histOpen ? (
                  <div>
                    {lead.calls.length === 0 ? (
                      <div className="body dim">Още няма записани обаждания.</div>
                    ) : (
                      [...lead.calls]
                        .reverse()
                        .map((c) => (
                          <div className="hist" key={c.id}>
                            <div className="row wrap">
                              <span className="when">{formatStampBg(c.timestamp)}</span>
                              <StatusChip campaign={campaign} value={c.статус} />
                              {c.следващоДействие ? (
                                <span className="dim" style={{ fontSize: 11 }}>
                                  → {c.следващоДействие}
                                  {c.следващаДата ? ` (${formatBgShortISO(c.следващаДата)})` : ""}
                                </span>
                              ) : null}
                            </div>
                            {c.вербатим ? <div className="txt">{c.вербатим}</div> : null}
                            {c.бележки ? (
                              <div className="txt muted" style={{ fontSize: 12 }}>
                                {c.бележки}
                              </div>
                            ) : null}
                          </div>
                        ))
                    )}
                  </div>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
