export interface PaletteEntry {
  label: string;
  hex: string;
}

/** Named colors used by statuses and script node groups. */
export const PALETTE: Record<string, PaletteEntry> = {
  gray: { label: "сиво", hex: "#8b93a1" },
  dark: { label: "тъмно", hex: "#4b5563" },
  amber: { label: "кехлибар", hex: "#e0932a" },
  yellow: { label: "жълто", hex: "#d4b021" },
  orange: { label: "оранжево", hex: "#ee7833" },
  red: { label: "червено", hex: "#e0524a" },
  green: { label: "зелено", hex: "#3aa860" },
  teal: { label: "тюркоаз", hex: "#1fa39a" },
  blue: { label: "синьо", hex: "#4b8ff0" },
  purple: { label: "лилаво", hex: "#9a72ef" },
};

export const PALETTE_NAMES = Object.keys(PALETTE);

/** Accepts a palette name or a raw #hex. */
export function colorHex(color: string | undefined): string {
  if (!color) return PALETTE.gray.hex;
  return PALETTE[color]?.hex ?? color;
}

/** Translucent tint of the color, for backgrounds. */
export function colorTint(color: string | undefined, alpha = 0.16): string {
  const hex = colorHex(color).replace("#", "");
  const full = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return `rgba(139,147,161,${alpha})`;
  return `rgba(${r},${g},${b},${alpha})`;
}
