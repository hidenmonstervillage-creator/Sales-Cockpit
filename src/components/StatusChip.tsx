import type { Campaign } from "../types";
import { findStatus } from "../lib/cadence";
import { colorHex, colorTint } from "../lib/palette";

/**
 * Renders a lead status. Unknown values (raw text kept from a CSV import)
 * fall back to a gray chip with the original text.
 */
export function StatusChip({
  campaign,
  value,
  onClick,
}: {
  campaign: Campaign;
  value: string | undefined;
  onClick?: () => void;
}) {
  if (!value) return <span className="dim">—</span>;
  const status = findStatus(campaign, value);
  const color = status?.color ?? "gray";
  return (
    <span
      className="chip"
      onClick={onClick}
      style={{
        background: colorTint(color),
        borderColor: colorHex(color),
        color: colorHex(color),
      }}
      title={status ? undefined : "Непознат статус от CSV — запазен като текст"}
    >
      {status?.win ? <span className="win-star">★</span> : null}
      {status?.label ?? value}
    </span>
  );
}

export function StatusPicker({
  campaign,
  value,
  onPick,
}: {
  campaign: Campaign;
  value: string;
  onPick: (id: string) => void;
}) {
  const known = campaign.statuses.some((s) => s.id === value);
  return (
    <div className="row wrap" style={{ gap: 5 }}>
      {campaign.statuses.map((s) => (
        <span
          key={s.id}
          className={`chip pick ${value === s.id ? "on" : ""}`}
          onClick={() => onPick(s.id)}
          style={{
            background: colorTint(s.color),
            borderColor: colorHex(s.color),
            color: colorHex(s.color),
          }}
        >
          {s.win ? <span className="win-star">★</span> : null}
          {s.label}
        </span>
      ))}
      {!known && value ? (
        <span className="chip" style={{ borderColor: "#8b93a1", color: "#8b93a1" }}>
          {value}
        </span>
      ) : null}
    </div>
  );
}
