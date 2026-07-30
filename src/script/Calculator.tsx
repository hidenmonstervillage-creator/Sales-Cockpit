import type { Campaign } from "../types";
import { breakevenCalls } from "../lib/placeholders";

/**
 * Breakeven widget. N = ceil(investment / avg service).
 * Sanity check: investment 2900, услуга 200 → 15.
 */
export function Calculator({
  campaign,
  value,
  onChange,
}: {
  campaign: Campaign;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
}) {
  const n = breakevenCalls(campaign.calc.investment, value);
  return (
    <div className="calc" title={`Инвестиция: ${campaign.calc.investment} ${campaign.calc.label}`}>
      <span className="dim" style={{ fontSize: 12 }}>
        Средна услуга ({campaign.calc.label})
      </span>
      <input
        type="number"
        min={0}
        step={10}
        value={value ?? ""}
        placeholder="—"
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") onChange(undefined);
          else {
            const num = Number(raw);
            onChange(Number.isNaN(num) ? undefined : num);
          }
        }}
      />
      {n === null ? (
        <span className="out none">
          {campaign.calc.investment > 0 ? "въведи услуга" : "въведи инвестиция в Настройки"}
        </span>
      ) : (
        <span className="out">{n} обаждания до нула</span>
      )}
    </div>
  );
}
