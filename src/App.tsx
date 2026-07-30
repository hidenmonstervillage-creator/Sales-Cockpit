import { useMemo, useState } from "react";
import { useStore } from "./store";
import { TopBar } from "./components/TopBar";
import { SettingsModal } from "./components/SettingsModal";
import { LeadsView } from "./views/LeadsView";
import { CallView } from "./views/CallView";
import { QueueView } from "./views/QueueView";
import { isClosedStatus } from "./lib/cadence";
import { diffDays, todayISO } from "./lib/dates";
import { BUILD_LABEL, IS_DEV } from "./lib/build";

type Tab = "leads" | "call" | "queue";

export function App() {
  const { campaign, state, setActiveCampaign, saveError, notice, setNotice } = useStore();
  const [tab, setTab] = useState<Tab>("leads");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [leadByCampaign, setLeadByCampaign] = useState<Record<string, string>>({});

  const activeLeadId = leadByCampaign[campaign.id] ?? null;
  const lead = useMemo(
    () => campaign.leads.find((l) => l.id === activeLeadId) ?? null,
    [campaign.leads, activeLeadId],
  );

  const queueCount = useMemo(() => {
    const today = todayISO();
    return campaign.leads.filter(
      (l) =>
        !isClosedStatus(campaign, l.статус) &&
        l.nextAction?.date &&
        diffDays(l.nextAction.date, today) <= 0,
    ).length;
  }, [campaign]);

  function openLead(campaignId: string, leadId: string) {
    if (campaignId !== campaign.id) setActiveCampaign(campaignId);
    setLeadByCampaign((prev) => ({ ...prev, [campaignId]: leadId }));
    setTab("call");
  }

  return (
    <div className="app">
      <TopBar onOpenSettings={() => setSettingsOpen(true)} />

      {saveError ? <div className="banner error">{saveError}</div> : null}
      {notice ? (
        <div className="banner info" onClick={() => setNotice(null)} style={{ cursor: "pointer" }}>
          {notice} <span className="dim">(клик за скриване)</span>
        </div>
      ) : null}

      <div className="tabs">
        <button className={`tab ${tab === "leads" ? "on" : ""}`} onClick={() => setTab("leads")}>
          Лийдове<span className="count">{campaign.leads.length}</span>
        </button>
        <button className={`tab ${tab === "call" ? "on" : ""}`} onClick={() => setTab("call")}>
          Разговор
          {lead ? <span className="count">•</span> : null}
        </button>
        <button className={`tab ${tab === "queue" ? "on" : ""}`} onClick={() => setTab("queue")}>
          Опашка
          {queueCount > 0 ? <span className="count">{queueCount}</span> : null}
        </button>
        <div className="spacer" />
        <span className="dim" style={{ alignSelf: "center", fontSize: 11, paddingRight: 4 }}>
          {state.campaigns.length} кампании · локално, без мрежа ·{" "}
          <span className={IS_DEV ? "build-stamp dev" : "build-stamp"} title="Коя версия е отворена">
            {BUILD_LABEL}
          </span>
        </span>
      </div>

      <div className="main">
        {tab === "leads" ? (
          <LeadsView onOpenLead={(id) => openLead(campaign.id, id)} />
        ) : null}
        {tab === "call" ? (
          <CallView lead={lead} onPickLead={(id) => openLead(campaign.id, id)} />
        ) : null}
        {tab === "queue" ? <QueueView onOpenLead={openLead} /> : null}
      </div>

      {settingsOpen ? <SettingsModal onClose={() => setSettingsOpen(false)} /> : null}
    </div>
  );
}
