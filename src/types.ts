// ── Call Cockpit data model ────────────────────────────────────────────────────
// Everything lives in localStorage under one key (see lib/storage.ts).

export type LeadFieldType = "text" | "tel" | "url" | "number" | "longtext";

export interface LeadField {
  key: string;
  label: string;
  type: LeadFieldType;
  /** Declared placeholder token, e.g. "град" → usable as [град] in script text. */
  token?: string;
  showInTable: boolean;
  /** The field used as the row's display name (Фирма for AutoClick). */
  primary?: boolean;
}

export interface PrepField {
  key: string;
  label: string;
}

export interface Status {
  id: string;
  label: string;
  /** Palette name (see lib/palette.ts) or a raw #hex. */
  color: string;
  triggersCadence?: boolean;
  closed?: boolean;
  win?: boolean;
  /** e.g. "Не вдига" suggests +1 day. */
  retryDays?: number;
}

export type CadenceChannel = "съобщение" | "обаждане";

export interface CadenceStep {
  id: string;
  /** Anchored at the first triggersCadence call (lead.anchorDate). */
  offsetDays?: number;
  /** Anchored at campaign.deadline (e.g. 7, 3). Skipped when there is no deadline. */
  beforeDeadlineDays?: number;
  hint: string;
  channel?: CadenceChannel;
}

export type NodeActionKind = "focusVerbatim" | "setStatus";

export interface NodeAction {
  kind: NodeActionKind;
  statusId?: string;
  label: string;
}

export interface ScriptNode {
  id: string;
  title: string;
  hint?: string;
  body: string;
  group: string;
  color: string;
  imageDataUrl?: string;
  position: { x: number; y: number };
  actions?: NodeAction[];
}

export interface ScriptEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  dashed?: boolean;
}

export interface CallLog {
  id: string;
  timestamp: string;
  статус: string;
  /** Snapshot of campaign.prepFields values at call time. */
  prep: Record<string, string>;
  среднаУслуга?: number;
  breakeven?: number;
  вербатим: string;
  следващоДействие: string;
  следващаДата: string;
  бележки: string;
}

export interface Lead {
  id: string;
  fields: Record<string, string | number>;
  prep: Record<string, string>;
  /** Either a Status.id or raw text kept verbatim from a CSV import. */
  статус: string;
  среднаУслуга?: number;
  /** Set on the first call logged with a triggersCadence status. */
  anchorDate?: string;
  lastTouch?: string;
  nextAction?: { text: string; date: string };
  calls: CallLog[];
}

export interface Campaign {
  id: string;
  name: string;
  createdAt: string;
  /** ISO date; hard stop. Empty/undefined = no deadline. */
  deadline?: string;
  /** Substitutes [номер] in scripts. */
  myPhone?: string;
  calc: { investment: number; label: string };
  statuses: Status[];
  cadence: CadenceStep[];
  cadenceRules?: string;
  leadFields: LeadField[];
  prepFields: PrepField[];
  script: { nodes: ScriptNode[]; edges: ScriptEdge[] };
  leads: Lead[];
}

export interface AppState {
  activeCampaignId: string;
  campaigns: Campaign[];
}
