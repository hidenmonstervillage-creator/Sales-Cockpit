import type { Campaign, Lead, Status } from "../types";
import { addDaysISO, diffDays, todayISO } from "./dates";

export interface Suggestion {
  /** Suggested follow-up text; empty when there is nothing to suggest. */
  text: string;
  /** ISO date, never past campaign.deadline. Empty when there is nothing to suggest. */
  date: string;
  /** Shown instead of a suggestion when the ladder has run out. */
  message?: string;
}

export const EMPTY_SUGGESTION: Suggestion = { text: "", date: "" };
export const CLOSING_MESSAGE = "Кампанията затваря — само раздяла.";

export function findStatus(campaign: Campaign, statusId: string | undefined): Status | undefined {
  if (!statusId) return undefined;
  return campaign.statuses.find((s) => s.id === statusId);
}

/** Status label for a lead — falls back to raw imported text. */
export function statusLabel(campaign: Campaign, value: string | undefined): string {
  if (!value) return "";
  return findStatus(campaign, value)?.label ?? value;
}

export function isClosedStatus(campaign: Campaign, value: string | undefined): boolean {
  return findStatus(campaign, value)?.closed === true;
}

/** Latest pickable date — the campaign deadline, or unbounded when there is none. */
export function maxPickableDate(campaign: Campaign): string | undefined {
  return campaign.deadline || undefined;
}

function clampToDeadline(campaign: Campaign, iso: string): string | null {
  if (!campaign.deadline) return iso;
  return diffDays(iso, campaign.deadline) > 0 ? null : iso;
}

interface ComputedStep {
  date: string;
  text: string;
}

function computeSteps(campaign: Campaign, anchor: string): ComputedStep[] {
  const steps: ComputedStep[] = [];
  for (const step of campaign.cadence) {
    let date: string | null = null;
    if (typeof step.offsetDays === "number") {
      date = addDaysISO(anchor, step.offsetDays);
    } else if (typeof step.beforeDeadlineDays === "number") {
      // No deadline → these steps simply do not exist.
      if (!campaign.deadline) continue;
      date = addDaysISO(campaign.deadline, -step.beforeDeadlineDays);
    }
    if (!date) continue;
    const text = step.channel ? `${step.hint} (${step.channel})` : step.hint;
    steps.push({ date, text });
  }
  return steps.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/**
 * The cadence engine.
 *  · closed status                → never a suggestion
 *  · retryDays                    → today + retryDays, hint „опитай пак"
 *  · triggersCadence (or an already anchored lead) → earliest unmet ladder step
 *  · nothing matches              → empty suggestion, user fills it in
 * No returned date ever exceeds campaign.deadline.
 */
export function suggestNext(
  campaign: Campaign,
  lead: Lead | null,
  statusValue: string,
  today = todayISO(),
): Suggestion {
  const status = findStatus(campaign, statusValue);
  if (status?.closed) return EMPTY_SUGGESTION;

  if (status && typeof status.retryDays === "number") {
    const date = clampToDeadline(campaign, addDaysISO(today, status.retryDays));
    if (!date) return { text: "", date: "", message: CLOSING_MESSAGE };
    return { text: "опитай пак", date };
  }

  const anchored = Boolean(lead?.anchorDate);
  if (!status?.triggersCadence && !anchored) return EMPTY_SUGGESTION;
  if (campaign.cadence.length === 0) return EMPTY_SUGGESTION;

  const anchor = lead?.anchorDate || today;
  const steps = computeSteps(campaign, anchor);

  for (const step of steps) {
    if (diffDays(step.date, today) < 0) continue; // already in the past
    if (campaign.deadline && diffDays(step.date, campaign.deadline) > 0) continue;
    return { text: step.text, date: step.date };
  }

  return { text: "", date: "", message: CLOSING_MESSAGE };
}

/** Preview of the whole ladder for a lead — used by the Разговор panel. */
export function cadencePreview(
  campaign: Campaign,
  lead: Lead | null,
  today = todayISO(),
): { date: string; text: string; past: boolean; beyond: boolean }[] {
  const anchor = lead?.anchorDate;
  if (!anchor) return [];
  return computeSteps(campaign, anchor).map((s) => ({
    ...s,
    past: diffDays(s.date, today) < 0,
    beyond: Boolean(campaign.deadline) && diffDays(s.date, campaign.deadline!) > 0,
  }));
}
