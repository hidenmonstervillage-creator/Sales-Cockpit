import type { Campaign } from "../types";

/**
 * Priority values are free text (campaigns define their own fields), but
 * alphabetical order is wrong for the common words: „ВИСОК, НИСЪК, СРЕДЕН"
 * would put low above medium. Rank the words we recognise, then fall back to
 * numeric, then to locale order — so an unknown vocabulary still sorts sanely.
 */
const RANKS: Record<string, number> = {
  висок: 0,
  високо: 0,
  high: 0,
  спешно: 0,
  среден: 1,
  средно: 1,
  medium: 1,
  med: 1,
  нисък: 2,
  ниско: 2,
  low: 2,
};

function rank(value: string): number | null {
  const key = value.trim().toLowerCase();
  return key in RANKS ? RANKS[key] : null;
}

/** Ascending: most urgent first. Empty values sort last. */
export function comparePriorityValues(a: string, b: string): number {
  const ta = a.trim();
  const tb = b.trim();
  if (!ta && !tb) return 0;
  if (!ta) return 1;
  if (!tb) return -1;

  const ra = rank(ta);
  const rb = rank(tb);
  if (ra !== null && rb !== null && ra !== rb) return ra - rb;
  if (ra !== null && rb === null) return -1;
  if (ra === null && rb !== null) return 1;

  const na = Number(ta);
  const nb = Number(tb);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;

  return ta.localeCompare(tb, "bg");
}

/** Campaign-generic: a lead field literally called „Приоритет" drives the sort. */
export function priorityFieldKey(campaign: Campaign): string | null {
  return campaign.leadFields.find((f) => /приоритет|priority/i.test(f.label))?.key ?? null;
}
