const MONTHS_BG = [
  "януари",
  "февруари",
  "март",
  "април",
  "май",
  "юни",
  "юли",
  "август",
  "септември",
  "октомври",
  "ноември",
  "декември",
];

const DAY_MS = 24 * 60 * 60 * 1000;

/** Local (not UTC) YYYY-MM-DD. The whole app works in local dates only. */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

/** Parses YYYY-MM-DD as a local date (never UTC — avoids off-by-one). */
export function fromISODate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function addDaysISO(iso: string, days: number): string {
  const d = fromISODate(iso);
  if (!d) return iso;
  return toISODate(new Date(d.getTime() + days * DAY_MS));
}

/** Positive if `a` is after `b`. Whole days. */
export function diffDays(a: string, b: string): number {
  const da = fromISODate(a);
  const db = fromISODate(b);
  if (!da || !db) return 0;
  return Math.round((da.getTime() - db.getTime()) / DAY_MS);
}

/** „29 юли" */
export function formatBgShort(d: Date): string {
  return `${d.getDate()} ${MONTHS_BG[d.getMonth()]}`;
}

export function formatBgShortISO(iso: string): string {
  const d = fromISODate(iso);
  return d ? formatBgShort(d) : iso;
}

/** „29 юли 2026" */
export function formatBgLongISO(iso: string): string {
  const d = fromISODate(iso);
  return d ? `${formatBgShort(d)} ${d.getFullYear()}` : iso;
}

/** „18.08" */
export function formatDotShortISO(iso: string): string {
  const d = fromISODate(iso);
  if (!d) return iso;
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** „29.07.2026 14:05" */
export function formatStampBg(timestamp: string): string {
  const d = new Date(timestamp);
  if (Number.isNaN(d.getTime())) return timestamp;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}.${mm}.${d.getFullYear()} ${hh}:${mi}`;
}

/** Value for <input type="datetime-local">, local time. */
export function toDatetimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

export function fromDatetimeLocal(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

/** Bulgarian day-count wording: „3 дни", „1 ден". */
export function daysWord(n: number): string {
  return n === 1 ? "1 ден" : `${n} дни`;
}
