import type { Campaign, Lead } from "../types";
import { formatBgShort } from "./dates";

export interface TokenContext {
  /** token → resolved value. Empty string means "declared but empty" → still unresolved. */
  values: Record<string, string>;
  /** Every token the campaign currently offers, for the editor chip list. */
  available: string[];
}

export interface Segment {
  text: string;
  unresolved: boolean;
}

/** Bulgarian definite-article endings, so [града] resolves a token declared as „град". */
const ARTICLE_SUFFIXES = ["ът", "ят", "ите", "те", "та", "то", "а", "я"];

export const BUILTIN_TOKENS = ["X", "breakeven", "номер", "дата"];

export function breakevenCalls(investment: number, avgService: number | undefined): number | null {
  if (!avgService || avgService <= 0 || !investment || investment <= 0) return null;
  return Math.ceil(investment / avgService);
}

export function buildTokenContext(
  campaign: Campaign,
  lead: Lead | null,
  avgService?: number,
): TokenContext {
  const values: Record<string, string> = {};
  const available: string[] = [];

  for (const field of campaign.leadFields) {
    if (!field.token) continue;
    available.push(field.token);
    const raw = lead ? lead.fields[field.key] : undefined;
    values[field.token] = raw === undefined || raw === null ? "" : String(raw);
  }

  const avg = avgService ?? lead?.среднаУслуга;
  const be = breakevenCalls(campaign.calc.investment, avg);

  values["X"] = avg ? String(avg) : "";
  values["breakeven"] = be === null ? "" : String(be);
  values["номер"] = campaign.myPhone?.trim() ?? "";
  values["дата"] = formatBgShort(new Date());
  available.push(...BUILTIN_TOKENS);

  return { values, available };
}

function lookup(raw: string, values: Record<string, string>): string | undefined {
  if (raw in values) return values[raw];
  const lower = raw.toLowerCase();
  if (lower in values) return values[lower];
  for (const suffix of ARTICLE_SUFFIXES) {
    if (lower.length > suffix.length + 1 && lower.endsWith(suffix)) {
      const stem = lower.slice(0, -suffix.length);
      if (stem in values) return values[stem];
    }
  }
  return undefined;
}

const TOKEN_RE = /\[([^[\]\n]+)\]/g;

/**
 * Splits text into plain and unresolved segments.
 * Unresolved tokens keep their original `[...]` text so nothing is ever silently dropped.
 */
export function splitSegments(text: string, ctx: TokenContext): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  TOKEN_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TOKEN_RE.exec(text)) !== null) {
    if (m.index > last) out.push({ text: text.slice(last, m.index), unresolved: false });
    const resolved = lookup(m[1].trim(), ctx.values);
    if (resolved && resolved.trim() !== "") {
      out.push({ text: resolved, unresolved: false });
    } else {
      out.push({ text: m[0], unresolved: true });
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), unresolved: false });
  if (out.length === 0) out.push({ text, unresolved: false });
  return out;
}

/** Plain-text resolution (for one-line places like node card previews). */
export function resolveText(text: string, ctx: TokenContext): string {
  return splitSegments(text, ctx)
    .map((s) => s.text)
    .join("");
}
