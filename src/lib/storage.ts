import type { AppState } from "../types";

export const STORAGE_KEY = "callcockpit.v1";

export interface LoadResult {
  state: AppState | null;
  error?: string;
}

export function loadState(): LoadResult {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { state: null };
    const parsed = JSON.parse(raw) as AppState;
    if (!parsed || !Array.isArray(parsed.campaigns)) {
      return { state: null, error: "Записаното състояние е повредено — стартирам наново." };
    }
    return { state: parsed };
  } catch (e) {
    return { state: null, error: `Не мога да прочета записаното състояние: ${String(e)}` };
  }
}

export function saveState(state: AppState): { ok: true } | { ok: false; error: string } {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return { ok: true };
  } catch (e) {
    const quota =
      e instanceof DOMException &&
      (e.name === "QuotaExceededError" || e.name === "NS_ERROR_DOM_QUOTA_REACHED");
    return {
      ok: false,
      error: quota
        ? "Няма място в localStorage. Свали JSON архив и махни някои снимки от възлите."
        : `Записът се провали: ${String(e)}`,
    };
  }
}

export function clearState(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/** localStorage stores UTF-16, so the real cost is ~2 bytes per character. */
export function stateBytes(state: AppState): number {
  return JSON.stringify(state).length * 2;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export const STORAGE_WARN_BYTES = 4 * 1024 * 1024;

/** Triggers a local file download — no network involved. */
export function downloadTextFile(filename: string, text: string, mime: string): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file, "utf-8");
  });
}
