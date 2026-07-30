import { useMemo, useState } from "react";
import type { Campaign, Lead } from "../types";
import { useStore } from "../store";
import { StatusChip } from "../components/StatusChip";
import { isClosedStatus } from "../lib/cadence";
import { daysWord, diffDays, formatBgShortISO, formatDotShortISO, todayISO } from "../lib/dates";
import { comparePriorityValues, priorityFieldKey } from "../lib/priority";

interface Row {
  campaign: Campaign;
  lead: Lead;
  date: string;
  text: string;
  priority: string;
}

function fieldText(lead: Lead, key: string): string {
  const v = lead.fields[key];
  return v === undefined || v === null ? "" : String(v);
}

function primaryName(campaign: Campaign, lead: Lead): string {
  const primary = campaign.leadFields.find((f) => f.primary) ?? campaign.leadFields[0];
  const value = primary ? lead.fields[primary.key] : "";
  return String(value || "").trim() || "(без име)";
}


export function QueueView({
  onOpenLead,
}: {
  onOpenLead: (campaignId: string, leadId: string) => void;
}) {
  const { state, campaign } = useStore();
  const [scope, setScope] = useState<"active" | "all">("active");
  const [sortMode, setSortMode] = useState<"priority" | "date">("priority");
  const today = todayISO();

  const rows = useMemo(() => {
    const campaigns = scope === "active" ? [campaign] : state.campaigns;
    const out: Row[] = [];
    for (const c of campaigns) {
      const pKey = priorityFieldKey(c);
      for (const lead of c.leads) {
        if (isClosedStatus(c, lead.статус)) continue;
        if (!lead.nextAction?.date) continue;
        out.push({
          campaign: c,
          lead,
          date: lead.nextAction.date,
          text: lead.nextAction.text,
          priority: pKey ? fieldText(lead, pKey).trim() : "",
        });
      }
    }
    out.sort((a, b) => {
      if (sortMode === "priority") {
        const p = comparePriorityValues(a.priority, b.priority);
        if (p !== 0) return p;
      }
      return a.date.localeCompare(b.date);
    });
    return out;
  }, [scope, state.campaigns, campaign, sortMode]);

  const overdue = rows.filter((r) => diffDays(r.date, today) < 0);
  const dueToday = rows.filter((r) => diffDays(r.date, today) === 0);
  const upcoming = rows.filter((r) => diffDays(r.date, today) > 0);

  const deadlineDays = campaign.deadline ? diffDays(campaign.deadline, today) : null;

  return (
    <div className="view">
      <div className="queue-banner">
        {deadlineDays !== null ? (
          <span className={`countdown ${deadlineDays > 14 ? "calm" : ""}`}>
            {deadlineDays < 0
              ? `срокът мина (${formatDotShortISO(campaign.deadline!)})`
              : `${daysWord(deadlineDays)} до ${formatDotShortISO(campaign.deadline!)}`}
          </span>
        ) : (
          <span className="dim">без краен срок</span>
        )}
        {campaign.cadenceRules ? <span className="rules">{campaign.cadenceRules}</span> : null}
        <div className="spacer" />
        <div className="mode-toggle">
          <button className={scope === "active" ? "on" : ""} onClick={() => setScope("active")}>
            Активна кампания
          </button>
          <button className={scope === "all" ? "on" : ""} onClick={() => setScope("all")}>
            Всички кампании
          </button>
        </div>
        <div className="mode-toggle">
          <button
            className={sortMode === "priority" ? "on" : ""}
            onClick={() => setSortMode("priority")}
          >
            Приоритет
          </button>
          <button className={sortMode === "date" ? "on" : ""} onClick={() => setSortMode("date")}>
            Дата
          </button>
        </div>
      </div>

      <div className="scroller">
        <Section
          title={`Просрочени (${overdue.length})`}
          hot
          rows={overdue}
          scope={scope}
          today={today}
          onOpenLead={onOpenLead}
        />
        <Section
          title={`Днес (${dueToday.length})`}
          rows={dueToday}
          scope={scope}
          today={today}
          onOpenLead={onOpenLead}
        />
        <Section
          title={`Предстоящи (${upcoming.length})`}
          rows={upcoming}
          scope={scope}
          today={today}
          onOpenLead={onOpenLead}
        />
        {rows.length === 0 ? (
          <div className="empty">
            Нищо в опашката. Логни обаждане със следващо действие, за да се появи тук.
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Section({
  title,
  rows,
  hot,
  scope,
  today,
  onOpenLead,
}: {
  title: string;
  rows: Row[];
  hot?: boolean;
  scope: "active" | "all";
  today: string;
  onOpenLead: (campaignId: string, leadId: string) => void;
}) {
  if (rows.length === 0) return null;
  return (
    <div className="qsection">
      <h3 className={hot ? "hot" : undefined}>{title}</h3>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              {scope === "all" ? <th className="plain">Кампания</th> : null}
              <th className="plain">Фирма</th>
              <th className="plain">Детайли</th>
              <th className="plain">Телефон</th>
              <th className="plain">Статус</th>
              <th className="plain">Следващо действие</th>
              <th className="plain">Дата</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const telField = r.campaign.leadFields.find((f) => f.type === "tel");
              const details = r.campaign.leadFields
                .filter((f) => f.showInTable && !f.primary && f.type === "text")
                .map((f) => fieldText(r.lead, f.key).trim())
                .filter(Boolean)
                .join(" · ");
              const late = diffDays(r.date, today) < 0;
              return (
                <tr
                  key={`${r.campaign.id}:${r.lead.id}`}
                  className={late ? "overdue" : undefined}
                  onClick={() => onOpenLead(r.campaign.id, r.lead.id)}
                >
                  {scope === "all" ? <td className="dim">{r.campaign.name}</td> : null}
                  <td>
                    <strong>{primaryName(r.campaign, r.lead)}</strong>
                  </td>
                  <td className="dim">{details}</td>
                  <td className="mono">{telField ? fieldText(r.lead, telField.key) : ""}</td>
                  <td>
                    <StatusChip campaign={r.campaign} value={r.lead.статус} />
                  </td>
                  <td title={r.text}>{r.text || "—"}</td>
                  <td className={late ? undefined : "dim"}>{formatBgShortISO(r.date)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
