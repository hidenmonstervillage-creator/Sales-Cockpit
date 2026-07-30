import { useMemo } from "react";
import type { TokenContext } from "../lib/placeholders";
import { splitSegments } from "../lib/placeholders";

/**
 * Renders script text with placeholders resolved from the open lead.
 * Unresolved tokens stay visible and highlighted yellow — never dropped.
 */
export function PlaceholderText({
  text,
  ctx,
  className,
}: {
  text: string;
  ctx: TokenContext;
  className?: string;
}) {
  const segments = useMemo(() => splitSegments(text, ctx), [text, ctx]);
  return (
    <div className={className}>
      {segments.map((seg, i) =>
        seg.unresolved ? (
          <mark className="ph-unresolved" key={i}>
            {seg.text}
          </mark>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </div>
  );
}
