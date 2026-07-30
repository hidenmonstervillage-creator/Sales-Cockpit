import Papa from "papaparse";
import type { Campaign, Lead } from "../types";
import { statusLabel } from "./cadence";
import { uid } from "./id";
import { toISODate } from "./dates";

/** Columns the exporter appends after the campaign's own lead fields. */
export const META_STATUS = "Статус";
export const META_LAST_TOUCH = "Последен контакт";
export const META_NEXT_TEXT = "Следващо действие";
export const META_NEXT_DATE = "Следваща дата";
export const META_COLUMNS = [META_STATUS, META_LAST_TOUCH, META_NEXT_TEXT, META_NEXT_DATE];

const BOM = "﻿";

export function exportLeadsCsv(campaign: Campaign): string {
  const headers = [...campaign.leadFields.map((f) => f.label), ...META_COLUMNS];
  const rows = campaign.leads.map((lead) => {
    const row: Record<string, string> = {};
    for (const f of campaign.leadFields) {
      const v = lead.fields[f.key];
      row[f.label] = v === undefined || v === null ? "" : String(v);
    }
    row[META_STATUS] = statusLabel(campaign, lead.статус);
    row[META_LAST_TOUCH] = lead.lastTouch ? toISODate(new Date(lead.lastTouch)) : "";
    row[META_NEXT_TEXT] = lead.nextAction?.text ?? "";
    row[META_NEXT_DATE] = lead.nextAction?.date ?? "";
    return row;
  });
  // BOM so Excel opens Cyrillic correctly.
  return BOM + Papa.unparse({ fields: headers, data: rows }, { newline: "\r\n" });
}

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
}

export function parseCsvText(text: string): ParsedCsv {
  const clean = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const result = Papa.parse<Record<string, string>>(clean, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim(),
  });
  const headers = (result.meta.fields ?? []).filter((h) => h.length > 0);
  const rows = (result.data ?? []).filter((r) =>
    headers.some((h) => String(r[h] ?? "").trim() !== ""),
  );
  return { headers, rows };
}

/** What a CSV column should become on import. */
export type ColumnTarget =
  | { kind: "field"; key: string }
  | { kind: "meta"; name: string }
  | { kind: "new"; label: string }
  | { kind: "skip" };

export interface ColumnMapping {
  header: string;
  target: ColumnTarget;
  /** True when we matched it automatically, so the UI can grey the row out. */
  auto: boolean;
}

const norm = (s: string) => s.trim().toLowerCase();

export function autoMapColumns(campaign: Campaign, headers: string[]): ColumnMapping[] {
  return headers.map((header) => {
    const field = campaign.leadFields.find((f) => norm(f.label) === norm(header));
    if (field) return { header, target: { kind: "field", key: field.key }, auto: true };
    const meta = META_COLUMNS.find((m) => norm(m) === norm(header));
    if (meta) return { header, target: { kind: "meta", name: meta }, auto: true };
    return { header, target: { kind: "skip" }, auto: false };
  });
}

/** Resolves a raw Статус cell to a status id, or keeps the raw text verbatim. */
export function resolveStatusValue(campaign: Campaign, raw: string): string {
  const value = raw.trim();
  if (!value) return campaign.statuses[0]?.id ?? "";
  const hit = campaign.statuses.find((s) => norm(s.label) === norm(value));
  return hit ? hit.id : value;
}

export function buildLeadsFromCsv(
  campaign: Campaign,
  parsed: ParsedCsv,
  mappings: ColumnMapping[],
): Lead[] {
  return parsed.rows.map((row) => {
    const lead: Lead = {
      id: uid("lead"),
      fields: {},
      prep: {},
      статус: campaign.statuses[0]?.id ?? "",
      calls: [],
    };
    for (const f of campaign.prepFields) lead.prep[f.key] = "";

    let nextText = "";
    let nextDate = "";

    for (const mapping of mappings) {
      const raw = String(row[mapping.header] ?? "").trim();
      const target = mapping.target;
      if (target.kind === "field") {
        const def = campaign.leadFields.find((f) => f.key === target.key);
        if (def?.type === "number") {
          const n = Number(raw.replace(",", "."));
          lead.fields[target.key] = raw === "" || Number.isNaN(n) ? "" : n;
        } else {
          lead.fields[target.key] = raw;
        }
      } else if (target.kind === "meta") {
        if (target.name === META_STATUS) lead.статус = resolveStatusValue(campaign, raw);
        else if (target.name === META_LAST_TOUCH && raw) lead.lastTouch = raw;
        else if (target.name === META_NEXT_TEXT) nextText = raw;
        else if (target.name === META_NEXT_DATE) nextDate = raw;
      }
    }

    if (nextText || nextDate) lead.nextAction = { text: nextText, date: nextDate };
    for (const f of campaign.leadFields) {
      if (!(f.key in lead.fields)) lead.fields[f.key] = "";
    }
    return lead;
  });
}
