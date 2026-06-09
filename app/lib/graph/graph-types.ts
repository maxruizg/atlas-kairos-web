/**
 * Segundo Cerebro — graph model.
 *
 * Pure types shared by `build-graph.ts`, the BrainGraph canvas, and the side
 * panel / controls. Nodes and links here are the *derived* graph (computed
 * from shared app state) — distinct from `GraphNodeMeta` which is the *user*
 * data (notes/pins) persisted per node in Supabase.
 */
import type { GraphNodeType } from "~/lib/types";

export type { GraphNodeType };

/** Association dimension a link expresses. `ownership` is the legal hierarchy. */
export type LinkType =
  | "ownership"
  | "theme"
  | "geo"
  | "vintage"
  | "sponsor"
  | "strategy"
  | "document";

/** All link kinds except ownership are "associative" (drawn dashed). */
export const ASSOCIATIVE_LINK_TYPES: LinkType[] = [
  "theme",
  "geo",
  "vintage",
  "sponsor",
  "strategy",
  "document",
];

/**
 * A graph node. Force-graph mutates `x/y/vx/vy/fx/fy` in place at runtime, so
 * those are optional + writable. Everything else is derived/read-only data we
 * attach for rendering, coloring, the tooltip, and navigation.
 */
export interface GraphNode {
  /** Stable graph id. Record id for concrete nodes; "theme:Fintech" etc. for concepts. */
  id: string;
  type: GraphNodeType;
  label: string;
  /** Relative weight (NAV / valuation / aggregate) → node radius. */
  weight: number;

  // Optional descriptive fields used for color-by modes + the tooltip.
  assetClass?: string;
  riskRating?: "green" | "yellow" | "red" | null;
  irr?: number | null;
  moic?: number | null;
  nav?: number | null;
  pctCalled?: number | null;
  entityId?: string;
  /** Sponsor accent colour (hex) for ring/fill where applicable. */
  sponsorColor?: string;
  /** Route to push on double-click, when the node maps to a detail page. */
  href?: string;
  /** Sub-label shown under the name (asset class, sector, "Concepto", …). */
  sub?: string;

  // Mutated by the force simulation — never set these in build-graph.
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number;
  fy?: number;
}

/** A link. `source`/`target` are node ids in build output; force-graph swaps in node refs at runtime. */
export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  linkType: LinkType;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

/** Helper: resolve a link endpoint to its node id whether raw or hydrated. */
export function endpointId(end: string | GraphNode): string {
  return typeof end === "string" ? end : end.id;
}
