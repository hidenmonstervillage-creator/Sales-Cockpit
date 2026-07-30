import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import type { AppState, Campaign, Lead } from "./types";
import { createAutoClickCampaign, createBlankCampaign } from "./seed/autoclick";
import { loadState, saveState, stateBytes } from "./lib/storage";
import { uid } from "./lib/id";
import { autoLayout } from "./lib/layout";

function bootstrap(): AppState {
  const camp = createAutoClickCampaign();
  return { activeCampaignId: camp.id, campaigns: [camp] };
}

/** Fills in anything an older/imported payload might be missing. */
export function normalizeState(input: AppState): AppState {
  const campaigns = (input.campaigns ?? []).map((c) => normalizeCampaign(c));
  const activeId = campaigns.some((c) => c.id === input.activeCampaignId)
    ? input.activeCampaignId
    : (campaigns[0]?.id ?? "");
  return { activeCampaignId: activeId, campaigns };
}

function normalizeCampaign(c: Campaign): Campaign {
  const leadFields = c.leadFields ?? [];
  const prepFields = c.prepFields ?? [];
  const nodes = (c.script?.nodes ?? []).map((node) => ({
    ...node,
    position: node.position ?? { x: 0, y: 0 },
  }));
  const edges = c.script?.edges ?? [];
  const needsLayout = nodes.length > 0 && nodes.every((n) => n.position.x === 0 && n.position.y === 0);
  return {
    ...c,
    // A closeNodeId pointing at a deleted node must not render a dead button.
    closeNodeId: nodes.some((n) => n.id === c.closeNodeId) ? c.closeNodeId : undefined,
    calc: c.calc ?? { investment: 0, label: "лв" },
    statuses: c.statuses ?? [],
    cadence: (c.cadence ?? []).map((s) => ({ ...s, id: s.id || uid("cad") })),
    leadFields,
    prepFields,
    script: { nodes: needsLayout ? autoLayout(nodes, edges) : nodes, edges },
    leads: (c.leads ?? []).map((lead) => ({
      ...lead,
      fields: lead.fields ?? {},
      prep: lead.prep ?? {},
      calls: (lead.calls ?? []).map((call) => ({
        ...call,
        id: call.id || uid("call"),
        prep: call.prep ?? {},
      })),
    })),
  };
}

interface StoreValue {
  state: AppState;
  campaign: Campaign;
  bytes: number;
  saveError: string | null;
  notice: string | null;
  setNotice: (msg: string | null) => void;
  replaceState: (next: AppState) => void;
  setActiveCampaign: (id: string) => void;
  updateCampaign: (updater: (c: Campaign) => Campaign) => void;
  updateCampaignById: (id: string, updater: (c: Campaign) => Campaign) => void;
  updateLead: (leadId: string, updater: (l: Lead) => Lead) => void;
  addCampaign: (name: string) => string;
  duplicateCampaign: (id: string) => string;
  deleteCampaign: (id: string) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => {
    const loaded = loadState();
    return loaded.state ? normalizeState(loaded.state) : bootstrap();
  });
  const [saveError, setSaveError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  // Autosave on every change (coalesced into one write per tick).
  useEffect(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const res = saveState(state);
      setSaveError(res.ok ? null : res.error);
    }, 150);
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, [state]);

  const campaign = useMemo(() => {
    return (
      state.campaigns.find((c) => c.id === state.activeCampaignId) ??
      state.campaigns[0] ??
      createBlankCampaign("Кампания")
    );
  }, [state]);

  const updateCampaignById = useCallback(
    (id: string, updater: (c: Campaign) => Campaign) => {
      setState((s) => ({
        ...s,
        campaigns: s.campaigns.map((c) => (c.id === id ? updater(c) : c)),
      }));
    },
    [],
  );

  const updateCampaign = useCallback(
    (updater: (c: Campaign) => Campaign) => {
      setState((s) => ({
        ...s,
        campaigns: s.campaigns.map((c) => (c.id === s.activeCampaignId ? updater(c) : c)),
      }));
    },
    [],
  );

  const updateLead = useCallback(
    (leadId: string, updater: (l: Lead) => Lead) => {
      updateCampaign((c) => ({
        ...c,
        leads: c.leads.map((l) => (l.id === leadId ? updater(l) : l)),
      }));
    },
    [updateCampaign],
  );

  const addCampaign = useCallback((name: string) => {
    const next = createBlankCampaign(name);
    setState((s) => ({ activeCampaignId: next.id, campaigns: [...s.campaigns, next] }));
    return next.id;
  }, []);

  const duplicateCampaign = useCallback((id: string) => {
    const newId = uid("camp");
    setState((s) => {
      const src = s.campaigns.find((c) => c.id === id);
      if (!src) return s;
      // Copies script + settings, deliberately NOT leads.
      const copy: Campaign = {
        ...structuredClone(src),
        id: newId,
        name: `${src.name} (копие)`,
        createdAt: new Date().toISOString(),
        leads: [],
      };
      return { activeCampaignId: newId, campaigns: [...s.campaigns, copy] };
    });
    return newId;
  }, []);

  const deleteCampaign = useCallback((id: string) => {
    setState((s) => {
      const campaigns = s.campaigns.filter((c) => c.id !== id);
      if (campaigns.length === 0) return bootstrap();
      return {
        campaigns,
        activeCampaignId: s.activeCampaignId === id ? campaigns[0].id : s.activeCampaignId,
      };
    });
  }, []);

  const setActiveCampaign = useCallback((id: string) => {
    setState((s) => ({ ...s, activeCampaignId: id }));
  }, []);

  const replaceState = useCallback((next: AppState) => {
    setState(normalizeState(next));
  }, []);

  const bytes = useMemo(() => stateBytes(state), [state]);

  const value: StoreValue = {
    state,
    campaign,
    bytes,
    saveError,
    notice,
    setNotice,
    replaceState,
    setActiveCampaign,
    updateCampaign,
    updateCampaignById,
    updateLead,
    addCampaign,
    duplicateCampaign,
    deleteCampaign,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore извън StoreProvider");
  return ctx;
}
