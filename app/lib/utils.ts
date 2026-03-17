export function formatCurrency(n: number): string {
  return n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : `$${(n / 1e3).toFixed(0)}K`;
}

export function formatMultiplier(n: number): string {
  return `${n.toFixed(2)}x`;
}

export function irrColor(irr: number): string {
  if (irr > 15) return "text-atlas-green";
  if (irr > 5) return "text-atlas-off-white";
  if (irr > 0) return "text-atlas-orange";
  return "text-atlas-red";
}

export function irrColorHex(irr: number, theme: "dark" | "light" = "dark"): string {
  if (theme === "light") {
    if (irr > 15) return "#059669";
    if (irr > 5) return "#111111";
    if (irr > 0) return "#D97706";
    return "#DC2626";
  }
  if (irr > 15) return "#00E5A0";
  if (irr > 5) return "#E8E8F2";
  if (irr > 0) return "#FFB347";
  return "#FF5C5C";
}

export function formatIrr(irr: number, decimals = 1): string {
  return `${irr > 0 ? "+" : ""}${irr.toFixed(decimals)}%`;
}

export function formatPercent(v: number): string {
  return `${v > 0 ? "+" : ""}${v.toFixed(1)}%`;
}

export function moicColor(v: number): string {
  if (v >= 2) return "text-atlas-green";
  if (v >= 1.5) return "text-atlas-purple-light";
  if (v >= 1) return "text-atlas-off-white";
  return "text-atlas-red";
}

export function moicColorHex(v: number, theme: "dark" | "light" = "dark"): string {
  if (theme === "light") {
    if (v >= 2) return "#059669";
    if (v >= 1.5) return "#6C5CC0";
    if (v >= 1) return "#111111";
    return "#DC2626";
  }
  if (v >= 2) return "#00E5A0";
  if (v >= 1.5) return "#B4A8EC";
  if (v >= 1) return "#E8E8F2";
  return "#FF5C5C";
}
