/**
 * Segundo Cerebro — canvas colours.
 *
 * The force-graph renders to a <canvas>, whose `fillStyle`/`strokeStyle` need
 * concrete hex — they cannot read `var(--color-atlas-*)`. So, exactly like
 * `chart-colors.ts`, we mirror the design tokens from `app.css` per theme and
 * expose resolved hex through `useGraphColors()`. The two token maps below are
 * the dark/light blocks of `app.css` verbatim — keep them in sync if tokens
 * change. No colour literals live anywhere else in the brain feature.
 */
import { useMemo } from "react";
import { useTheme } from "~/lib/theme-context";
import type { GraphNodeType, LinkType } from "./graph-types";

interface Tokens {
  bg: string;
  surface: string;
  card: string;
  border: string;
  borderBright: string;
  purple: string;
  purpleLight: string;
  green: string;
  blue: string;
  orange: string;
  red: string;
  cyan: string;
  white: string;
  offWhite: string;
  gray2: string;
  gray3: string;
  gray4: string;
}

const DARK: Tokens = {
  bg: "#060608", surface: "#0A0A0E", card: "#0F0F14",
  border: "#1C1C26", borderBright: "#2A2A38",
  purple: "#8B7BD8", purpleLight: "#B4A8EC",
  green: "#00E5A0", blue: "#4DA8FF", orange: "#FFB347", red: "#FF5C5C", cyan: "#00D4FF",
  white: "#FFFFFF", offWhite: "#E8E8F2", gray2: "#8080A0", gray3: "#6E6E8A", gray4: "#55556E",
};

const LIGHT: Tokens = {
  bg: "#F4F4F8", surface: "#FFFFFF", card: "#FFFFFF",
  border: "#E0E0EA", borderBright: "#C8C8D6",
  purple: "#6C5CC0", purpleLight: "#8B7BD8",
  green: "#059669", blue: "#2563EB", orange: "#D97706", red: "#DC2626", cyan: "#0098C0",
  white: "#111111", offWhite: "#2A2A40", gray2: "#6B7280", gray3: "#9CA3AF", gray4: "#B0B4BC",
};

export type ColorBy = "assetClass" | "risk" | "performance" | "entity";

export interface GraphColors {
  tokens: Tokens;
  /** Canvas background = theme bg. */
  background: string;
  /** Asset-class bucket → hex (VC purple · PE orange · Real Assets blue · Private Credit cyan · Infra green). */
  assetClass: (assetClass?: string) => string;
  /** Traffic-light risk → hex (matches RISK_META). */
  risk: (rating?: "green" | "yellow" | "red" | null) => string;
  /** IRR → hex performance ramp. */
  performance: (irr?: number | null) => string;
  /** Entity id → stable palette hex. */
  entity: (entityId: string | undefined, allEntityIds: string[]) => string;
  /** Default per-node-type fill when no color-by override applies. */
  nodeType: (type: GraphNodeType) => string;
  /** Link stroke by association dimension. */
  link: (type: LinkType) => string;
  /** Resolve a node's fill for a given color-by mode. */
  forNode: (
    node: {
      type: GraphNodeType;
      assetClass?: string;
      riskRating?: "green" | "yellow" | "red" | null;
      irr?: number | null;
      entityId?: string;
      sponsorColor?: string;
    },
    mode: ColorBy,
    allEntityIds: string[]
  ) => string;
}

function assetClassColor(t: Tokens, ac?: string): string {
  const s = (ac || "").toLowerCase();
  if (s.includes("venture") || s.includes("vc")) return t.purple;
  if (s.includes("infra")) return t.green;
  if (s.includes("credit") || s.includes("lending") || s.includes("debt")) return t.cyan;
  if (s.includes("real")) return t.blue; // Real Assets / Real Estate
  if (s.includes("private equity") || s.includes("buyout") || s === "pe") return t.orange;
  return t.purpleLight; // default / direct-investment buckets
}

export function useGraphColors(): GraphColors {
  const { theme } = useTheme();
  const t = theme === "light" ? LIGHT : DARK;

  return useMemo<GraphColors>(() => {
    const entityPalette = [t.purple, t.blue, t.green, t.orange, t.cyan, t.purpleLight, t.red];

    const risk = (r?: "green" | "yellow" | "red" | null) =>
      r === "green" ? t.green : r === "red" ? t.red : r === "yellow" ? t.orange : t.gray3;

    const performance = (irr?: number | null) => {
      if (irr == null) return t.gray3;
      if (irr > 15) return t.green;
      if (irr > 5) return t.purpleLight;
      if (irr > 0) return t.orange;
      return t.red;
    };

    const entity = (entityId: string | undefined, all: string[]) => {
      if (!entityId) return t.gray4;
      const i = Math.max(0, all.indexOf(entityId));
      return entityPalette[i % entityPalette.length];
    };

    const nodeType = (type: GraphNodeType) => {
      switch (type) {
        case "root": return t.purple;
        case "entity": return t.purple;
        case "sponsor": return t.purpleLight;
        case "fund": return t.blue;
        case "direct": return t.orange;
        case "company": return t.gray2;
        case "theme": return t.cyan;
        case "geo": return t.green;
        case "vintage": return t.purpleLight;
        case "strategy": return t.orange;
        case "document": return t.gray3;
        default: return t.gray3;
      }
    };

    const link = (type: LinkType) => {
      switch (type) {
        case "ownership": return t.borderBright;
        case "sponsor": return t.purpleLight;
        case "theme": return t.cyan;
        case "geo": return t.green;
        case "vintage": return t.purple;
        case "strategy": return t.orange;
        case "document": return t.gray4;
        default: return t.border;
      }
    };

    const forNode: GraphColors["forNode"] = (node, mode, all) => {
      // Concept nodes keep their identity colour regardless of mode.
      if (["theme", "geo", "vintage", "strategy", "document"].includes(node.type)) {
        return nodeType(node.type);
      }
      switch (mode) {
        case "risk": return risk(node.riskRating);
        case "performance": return performance(node.irr);
        case "entity": return entity(node.entityId, all);
        case "assetClass":
        default:
          if (node.type === "sponsor" && node.sponsorColor) return node.sponsorColor;
          if (node.type === "entity" || node.type === "root") return t.purple;
          return assetClassColor(t, node.assetClass);
      }
    };

    return {
      tokens: t,
      background: t.bg,
      assetClass: (ac) => assetClassColor(t, ac),
      risk,
      performance,
      entity,
      nodeType,
      link,
      forNode,
    };
  }, [t]);
}
