let counter = 0;

/** Local id generator — no network, no deps. */
export function uid(prefix = "id"): string {
  counter += 1;
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}${rand}`;
}

/** Turns Cyrillic/mixed text into a safe object key. Falls back to a uid. */
export function slugKey(text: string, taken: string[] = []): string {
  const base =
    text
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^\p{L}\p{N}_]/gu, "") || "field";
  let key = base;
  let n = 2;
  while (taken.includes(key)) {
    key = `${base}_${n}`;
    n += 1;
  }
  return key;
}
