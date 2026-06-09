import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router";
import ForceGraph2D from "react-force-graph-2d";
import type {
  Entity,
  Fund,
  DirectInvestment,
  Sponsor,
  Document,
  GraphNodeMeta,
} from "~/lib/types";
import { buildGraph } from "~/lib/graph/build-graph";
import type { GraphNode, GraphLink, GraphNodeType, LinkType } from "~/lib/graph/graph-types";
import { endpointId } from "~/lib/graph/graph-types";
import { useGraphColors, type ColorBy } from "~/lib/graph/graph-colors";
import { useClientData } from "~/lib/client-data-context";
import { useEntity } from "~/lib/entity-context";
import { useCan } from "~/lib/use-permissions";
import { useToast } from "~/lib/toast-context";
import { useT } from "~/lib/use-t";
import { formatCurrency, formatIrr, formatMultiplier } from "~/lib/utils";
import { DENIED_MESSAGE } from "~/lib/permissions";
import { GraphControls, type ForceParams } from "./GraphControls";
import { NodePanel, type NodeDetail, type PanelBacklink } from "./NodePanel";
import { NodeContextMenu, type ContextMenuState } from "./NodeContextMenu";
import { Minimap } from "./Minimap";

export interface BrainGraphProps {
  entities: Entity[];
  funds: Fund[];
  directInvestments: DirectInvestment[];
  sponsors: Sponsor[];
  documents: Document[];
  orgName: string;
}

const CONCEPT_TYPES: GraphNodeType[] = ["theme", "geo", "vintage", "strategy"];
const metaKey = (refId: string, type: string) => `${type}::${refId}`;

/** Append an alpha channel to a #rrggbb hex. */
function hexA(hex: string, alpha: number): string {
  if (!hex.startsWith("#") || hex.length < 7) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Stable per-node phase for the idle breathing animation. */
function phaseOf(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return (h % 1000) / 1000 * Math.PI * 2;
}

export default function BrainGraph(props: BrainGraphProps) {
  const { entities, funds, directInvestments, sponsors, documents, orgName } = props;
  const navigate = useNavigate();
  const colors = useGraphColors();
  const { selectedEntityId } = useEntity();
  const { graphNodeMeta, upsertGraphMeta, getGraphMeta } = useClientData();
  const can = useCan();
  const { toast } = useToast();
  const t = useT();
  const brain = (t as any).brain;
  const canEdit = can("graph.edit");

  const fgRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastClick = useRef<{ id: string; t: number }>({ id: "", t: 0 });

  const [dims, setDims] = useState({ w: 0, h: 0 });
  const [scope, setScope] = useState<string | null>(selectedEntityId);
  const [nodeTypes, setNodeTypes] = useState<Record<string, boolean>>({});
  const [linkTypes, setLinkTypes] = useState<Record<string, boolean>>({});
  const [colorBy, setColorBy] = useState<ColorBy>("assetClass");
  const [forces, setForces] = useState<ForceParams>({ linkDistance: 55, charge: -200, gravity: 0.08 });
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [ctxMenu, setCtxMenu] = useState<ContextMenuState | null>(null);
  const [sessionHidden, setSessionHidden] = useState<Set<string>>(new Set());

  // ── Lookups for panel detail ───────────────────────────────────────────
  const fundById = useMemo(() => new Map(funds.map((f) => [f.id, f])), [funds]);
  const directById = useMemo(() => new Map(directInvestments.map((d) => [d.id, d])), [directInvestments]);
  const entityById = useMemo(() => new Map(entities.map((e) => [e.id, e])), [entities]);
  const sponsorById = useMemo(() => new Map(sponsors.map((s) => [s.id, s])), [sponsors]);
  const entityIds = useMemo(() => entities.map((e) => e.id), [entities]);

  const metaMap = useMemo(() => {
    const m = new Map<string, GraphNodeMeta>();
    for (const g of graphNodeMeta) m.set(metaKey(g.node_ref_id, g.node_type), g);
    return m;
  }, [graphNodeMeta]);

  // ── Full graph (stable node identities until data/scope change) ──────────
  const full = useMemo(
    () => buildGraph({ entities, funds, directInvestments, sponsors, documents, orgName }, { scope }),
    [entities, funds, directInvestments, sponsors, documents, orgName, scope]
  );

  // Weight → radius scale across the whole graph.
  const radiusFor = useMemo(() => {
    const ws = full.nodes.map((n) => Math.max(n.weight, 1));
    const lo = Math.sqrt(Math.min(...ws, 1));
    const hi = Math.sqrt(Math.max(...ws, 1));
    const span = hi - lo || 1;
    return (n: GraphNode) => {
      if (n.type === "root") return 18;
      if (n.type === "company" || n.type === "document") {
        return 4 + ((Math.sqrt(Math.max(n.weight, 1)) - lo) / span) * 4;
      }
      return 5 + ((Math.sqrt(Math.max(n.weight, 1)) - lo) / span) * 13;
    };
  }, [full.nodes]);

  // ── Filtered graph (node/link type toggles + hidden) — reuses node objs ──
  const data = useMemo(() => {
    const hiddenIds = new Set<string>(sessionHidden);
    for (const g of graphNodeMeta) if (g.hidden) hiddenIds.add(g.node_ref_id);

    const nodeOn = (n: GraphNode) =>
      n.type === "root" ||
      (nodeTypes[n.type] !== false && !hiddenIds.has(n.id));

    const visibleNodes = full.nodes.filter(nodeOn);
    const visibleIds = new Set(visibleNodes.map((n) => n.id));

    // Apply pinned positions from meta to the (stable) node objects.
    for (const n of visibleNodes) {
      const meta = metaMap.get(metaKey(n.id, n.type));
      if (meta?.pinned && meta.pinned_x != null && meta.pinned_y != null) {
        n.fx = meta.pinned_x; n.fy = meta.pinned_y;
      } else if (n.fx != null && !meta?.pinned) {
        // released elsewhere — leave as-is; drag handler manages fx/fy
      }
    }

    const links = full.links.filter(
      (l) =>
        linkTypes[l.linkType] !== false &&
        visibleIds.has(endpointId(l.source)) &&
        visibleIds.has(endpointId(l.target))
    );
    return { nodes: visibleNodes, links };
  }, [full, nodeTypes, linkTypes, metaMap, graphNodeMeta, sessionHidden]);

  // Adjacency (filtered) for hover highlight + backlinks.
  const adjacency = useMemo(() => {
    const m = new Map<string, { id: string; linkType: LinkType }[]>();
    const push = (a: string, b: string, lt: LinkType) => {
      if (!m.has(a)) m.set(a, []);
      m.get(a)!.push({ id: b, linkType: lt });
    };
    for (const l of data.links) {
      const s = endpointId(l.source), tg = endpointId(l.target);
      push(s, tg, l.linkType);
      push(tg, s, l.linkType);
    }
    return m;
  }, [data.links]);

  const nodeById = useMemo(() => new Map(data.nodes.map((n) => [n.id, n])), [data.nodes]);

  // Highlight sets driven by hover.
  const highlight = useMemo(() => {
    if (!hoverId) return null;
    const ids = new Set<string>([hoverId]);
    for (const nb of adjacency.get(hoverId) || []) ids.add(nb.id);
    return ids;
  }, [hoverId, adjacency]);

  // ── Sizing ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setDims({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    setDims({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // ── Forces ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    try {
      fg.d3Force("charge")?.strength(forces.charge);
      fg.d3Force("link")?.distance(forces.linkDistance);
      const center = fg.d3Force("center");
      if (center?.strength) center.strength(forces.gravity);
      fg.d3ReheatSimulation();
    } catch {
      /* forces not ready */
    }
  }, [forces, data]);

  // ── Pause the render loop when tab hidden (perf + battery) ────────────────
  useEffect(() => {
    const onVis = () => {
      const fg = fgRef.current;
      if (!fg) return;
      if (document.hidden) fg.pauseAnimation?.();
      else fg.resumeAnimation?.();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // Keep local scope in sync if the global entity selector changes.
  useEffect(() => { setScope(selectedEntityId); }, [selectedEntityId]);

  // ── Camera helpers ────────────────────────────────────────────────────────
  const focusNode = useCallback((id: string) => {
    const n = nodeById.get(id) || full.nodes.find((x) => x.id === id);
    if (!n) return;
    setSelectedId(id);
    const fg = fgRef.current;
    if (fg && n.x != null && n.y != null) {
      fg.centerAt(n.x, n.y, 600);
      fg.zoom(3, 600);
    }
  }, [nodeById, full.nodes]);

  const onSearchSubmit = useCallback(() => {
    const term = search.trim().toLowerCase();
    if (!term) return;
    const hit = data.nodes.find((n) => n.label.toLowerCase().includes(term));
    if (hit) focusNode(hit.id);
  }, [search, data.nodes, focusNode]);

  const resetView = useCallback(() => {
    setSelectedId(null);
    fgRef.current?.zoomToFit(500, 60);
  }, []);

  // ── Node interactions ─────────────────────────────────────────────────────
  const onNodeClick = useCallback((node: GraphNode) => {
    const now = performance.now();
    const dbl = lastClick.current.id === node.id && now - lastClick.current.t < 320;
    lastClick.current = { id: node.id, t: now };
    if (dbl && node.href) { navigate(node.href); return; }
    focusNode(node.id);
  }, [navigate, focusNode]);

  const onNodeRightClick = useCallback((node: GraphNode, e: MouseEvent) => {
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY, node });
  }, []);

  const onNodeDragEnd = useCallback((node: GraphNode) => {
    const meta = getGraphMeta(node.id, node.type);
    if (meta?.pinned) {
      node.fx = node.x; node.fy = node.y;
      upsertGraphMeta({ ...meta, pinned_x: node.x ?? null, pinned_y: node.y ?? null });
    } else {
      // Not pinned → release so the node springs back into the layout.
      node.fx = undefined; node.fy = undefined;
    }
  }, [getGraphMeta, upsertGraphMeta]);

  // ── Mutations (gated) ──────────────────────────────────────────────────────
  const saveNotes = useCallback((node: GraphNode, text: string) => {
    if (!canEdit) { toast(DENIED_MESSAGE, "error"); return; }
    const existing = getGraphMeta(node.id, node.type);
    upsertGraphMeta({
      id: existing?.id ?? `gm-${crypto.randomUUID().replace(/-/g, "")}`,
      node_ref_id: node.id,
      node_type: node.type,
      notes_text: text,
      pinned: existing?.pinned ?? false,
      hidden: existing?.hidden ?? false,
      pinned_x: existing?.pinned_x ?? null,
      pinned_y: existing?.pinned_y ?? null,
    });
  }, [canEdit, getGraphMeta, upsertGraphMeta, toast]);

  const togglePin = useCallback((node: GraphNode) => {
    if (!canEdit) { toast(DENIED_MESSAGE, "error"); return; }
    const existing = getGraphMeta(node.id, node.type);
    const nextPinned = !(existing?.pinned);
    if (nextPinned) { node.fx = node.x; node.fy = node.y; }
    else { node.fx = undefined; node.fy = undefined; }
    upsertGraphMeta({
      id: existing?.id ?? `gm-${crypto.randomUUID().replace(/-/g, "")}`,
      node_ref_id: node.id,
      node_type: node.type,
      notes_text: existing?.notes_text ?? "",
      pinned: nextPinned,
      hidden: existing?.hidden ?? false,
      pinned_x: nextPinned ? node.x ?? null : null,
      pinned_y: nextPinned ? node.y ?? null : null,
    });
  }, [canEdit, getGraphMeta, upsertGraphMeta, toast]);

  const hideNode = useCallback((node: GraphNode) => {
    if (!canEdit) { toast(DENIED_MESSAGE, "error"); return; }
    setSessionHidden((p) => new Set(p).add(node.id));
    const existing = getGraphMeta(node.id, node.type);
    upsertGraphMeta({
      id: existing?.id ?? `gm-${crypto.randomUUID().replace(/-/g, "")}`,
      node_ref_id: node.id,
      node_type: node.type,
      notes_text: existing?.notes_text ?? "",
      pinned: existing?.pinned ?? false,
      hidden: true,
      pinned_x: existing?.pinned_x ?? null,
      pinned_y: existing?.pinned_y ?? null,
    });
  }, [canEdit, getGraphMeta, upsertGraphMeta, toast]);

  const expandNeighbors = useCallback((node: GraphNode) => {
    const fg = fgRef.current;
    const nbs = adjacency.get(node.id) || [];
    const xs = [node, ...nbs.map((n) => nodeById.get(n.id)).filter(Boolean)] as GraphNode[];
    if (fg && xs.length) {
      const minX = Math.min(...xs.map((n) => n.x ?? 0));
      const maxX = Math.max(...xs.map((n) => n.x ?? 0));
      const minY = Math.min(...xs.map((n) => n.y ?? 0));
      const maxY = Math.max(...xs.map((n) => n.y ?? 0));
      fg.centerAt((minX + maxX) / 2, (minY + maxY) / 2, 600);
      fg.zoom(2.2, 600);
    }
    setSelectedId(node.id);
  }, [adjacency, nodeById]);

  // ── Canvas painters ───────────────────────────────────────────────────────
  const paintNode = useCallback(
    (node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const t0 = performance.now();
      const baseR = radiusFor(node);
      const r = baseR * (1 + 0.035 * Math.sin(t0 * 0.0016 + phaseOf(node.id)));
      const x = node.x ?? 0, y = node.y ?? 0;

      const dim = highlight ? !highlight.has(node.id) : false;
      const isSel = selectedId === node.id;
      const isSearchHit =
        search.trim() !== "" && node.label.toLowerCase().includes(search.trim().toLowerCase());
      ctx.globalAlpha = dim ? 0.12 : 1;

      const fill = colors.forNode(node, colorBy, entityIds);

      // Selection / search glow.
      if (isSel || isSearchHit) {
        ctx.shadowColor = colors.tokens.purple;
        ctx.shadowBlur = 16;
      }

      ctx.beginPath();
      if (node.type === "direct") {
        // Diamond.
        ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y);
        ctx.closePath();
      } else if (node.type === "document") {
        ctx.rect(x - r, y - r, r * 2, r * 2);
      } else {
        ctx.arc(x, y, r, 0, Math.PI * 2);
      }
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Rings + concept dashed outline.
      const isConcept = CONCEPT_TYPES.includes(node.type);
      if (isConcept) {
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.strokeStyle = colors.tokens.borderBright;
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (node.type === "root" || node.type === "entity") {
        ctx.lineWidth = 2;
        ctx.strokeStyle = colors.tokens.purple;
        ctx.stroke();
      } else if ((node.type === "fund" || node.type === "company") && node.sponsorColor) {
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = node.sponsorColor;
        ctx.stroke();
      }

      // Labels — show when zoomed in, large, hovered, or selected.
      const showLabel = globalScale > 1.1 || baseR > 9 || isSel || node.id === hoverId;
      if (showLabel && !dim) {
        const fontSize = Math.max(9 / globalScale, 2.2);
        ctx.font = `${fontSize}px DM Sans, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillStyle = colors.tokens.offWhite;
        const label = node.label.length > 22 ? node.label.slice(0, 20) + "…" : node.label;
        ctx.fillText(label, x, y + r + 1.5);
        if (node.type === "company" && node.moic != null) {
          ctx.fillStyle = colors.tokens.gray2;
          ctx.font = `${fontSize}px IBM Plex Mono, monospace`;
          ctx.fillText(formatMultiplier(node.moic), x, y + r + 1.5 + fontSize + 1);
        }
      }
      ctx.globalAlpha = 1;
    },
    [radiusFor, highlight, selectedId, search, colors, colorBy, entityIds, hoverId]
  );

  const paintPointerArea = useCallback(
    (node: GraphNode, color: string, ctx: CanvasRenderingContext2D) => {
      const r = radiusFor(node);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(node.x ?? 0, node.y ?? 0, r + 2, 0, Math.PI * 2);
      ctx.fill();
    },
    [radiusFor]
  );

  // ── Link styling ────────────────────────────────────────────────────────
  const linkColor = useCallback((l: GraphLink) => {
    const base = colors.link(l.linkType);
    if (!highlight) return hexA(base, 0.45);
    const on = highlight.has(endpointId(l.source)) && highlight.has(endpointId(l.target));
    return on ? base : hexA(base, 0.05);
  }, [colors, highlight]);

  const linkWidth = useCallback((l: GraphLink) => {
    if (!highlight) return l.linkType === "ownership" ? 0.9 : 0.5;
    const on = highlight.has(endpointId(l.source)) && highlight.has(endpointId(l.target));
    return on ? 2.2 : 0.4;
  }, [highlight]);

  const linkDash = useCallback(
    (l: GraphLink) => (l.linkType === "ownership" ? null : [2.5, 2.5]),
    []
  );

  // ── Rich hover tooltip (HTML) ─────────────────────────────────────────────
  const nodeLabelHtml = useCallback((node: GraphNode) => {
    const rows: string[] = [];
    if (node.nav != null) rows.push(`NAV ${formatCurrency(node.nav)}`);
    if (node.irr != null) rows.push(`IRR ${formatIrr(node.irr)}`);
    if (node.moic != null) rows.push(`MOIC ${formatMultiplier(node.moic)}`);
    if (node.pctCalled != null) rows.push(`Called ${node.pctCalled.toFixed(0)}%`);
    const tk = colors.tokens;
    return (
      `<div style="background:${tk.card};border:1px solid ${tk.border};border-radius:8px;` +
      `padding:6px 9px;font-family:DM Sans,sans-serif;color:${tk.offWhite};font-size:11px;` +
      `box-shadow:0 4px 14px rgba(0,0,0,.4)">` +
      `<div style="font-weight:700;color:${tk.white}">${node.label}</div>` +
      (node.sub ? `<div style="color:${tk.gray3};font-size:10px">${node.sub}</div>` : "") +
      (rows.length ? `<div style="color:${tk.purpleLight};font-size:10px;margin-top:2px">${rows.join(" · ")}</div>` : "") +
      `</div>`
    );
  }, [colors]);

  // ── Selected-node detail for the side panel ────────────────────────────────
  const selectedNode = selectedId ? nodeById.get(selectedId) : null;

  const detail: NodeDetail | null = useMemo(() => {
    if (!selectedNode) return null;
    const n = selectedNode;
    const metrics: NodeDetail["metrics"] = [];
    let navHistory: number[] = [];

    if (n.type === "fund") {
      const f = fundById.get(n.id);
      if (f) {
        metrics.push({ label: "NAV", value: formatCurrency(f.nav) });
        metrics.push({ label: "Net IRR", value: formatIrr(f.net_irr), tone: f.net_irr >= 0 ? "pos" : "neg" });
        metrics.push({ label: "TVPI", value: formatMultiplier(f.tvpi) });
        metrics.push({ label: "MOIC", value: formatMultiplier(f.net_moic) });
        metrics.push({ label: "% Called", value: `${f.pct_called.toFixed(0)}%` });
        if (f.vintage) metrics.push({ label: "Vintage", value: String(f.vintage) });
        navHistory = (f.nav_history || []).map((p) => p.nav);
      }
    } else if (n.type === "direct") {
      const d = directById.get(n.id);
      if (d) {
        const moic = d.cost > 0 ? d.valuation / d.cost : 0;
        metrics.push({ label: "Valuation", value: formatCurrency(d.valuation) });
        metrics.push({ label: "Cost", value: formatCurrency(d.cost) });
        metrics.push({ label: "MOIC", value: formatMultiplier(moic), tone: moic >= 1 ? "pos" : "neg" });
        if (d.net_irr != null) metrics.push({ label: "Net IRR", value: formatIrr(d.net_irr) });
        metrics.push({ label: "Ownership", value: `${d.ownership_pct.toFixed(1)}%` });
        navHistory = (d.valuation_history || []).map((v) => v.value);
      }
    } else if (n.type === "entity") {
      const e = entityById.get(n.id);
      if (e) {
        metrics.push({ label: "NAV", value: formatCurrency(e.nav) });
        metrics.push({ label: "Funds", value: String(funds.filter((f) => f.entity_id === e.id).length) });
        metrics.push({ label: "Directs", value: String(directInvestments.filter((d) => d.entity_id === e.id).length) });
        if (e.risk_rating) metrics.push({ label: "Risk", value: e.risk_rating });
      }
    } else if (n.type === "sponsor") {
      const s = sponsorById.get(n.id.replace(/^sponsor:/, ""));
      if (s) {
        metrics.push({ label: "Total NAV", value: formatCurrency(s.total_nav) });
        metrics.push({ label: "Net IRR", value: formatIrr(s.net_irr), tone: s.net_irr >= 0 ? "pos" : "neg" });
        metrics.push({ label: "TVPI", value: formatMultiplier(s.tvpi) });
        metrics.push({ label: "Funds", value: String(s.fund_count) });
      }
    } else if (n.type === "company") {
      metrics.push({ label: "MOIC", value: formatMultiplier(n.moic ?? 0), tone: (n.moic ?? 0) >= 1 ? "pos" : "neg" });
      if (n.irr != null) metrics.push({ label: "IRR", value: formatIrr(n.irr) });
      if (n.nav != null) metrics.push({ label: "FMV", value: formatCurrency(n.nav) });
    } else if (CONCEPT_TYPES.includes(n.type)) {
      const conns = adjacency.get(n.id) || [];
      metrics.push({ label: "Posiciones", value: String(conns.length) });
      metrics.push({ label: "NAV", value: formatCurrency(n.weight) });
    }

    const nbs = adjacency.get(n.id) || [];
    const seen = new Set<string>();
    const backlinks: PanelBacklink[] = [];
    const chips: NodeDetail["chips"] = [];
    const docs: NodeDetail["documents"] = [];
    for (const nb of nbs) {
      const other = nodeById.get(nb.id);
      if (!other || seen.has(other.id)) continue;
      seen.add(other.id);
      if (other.type === "document") {
        docs.push({ id: other.id, label: other.label });
        continue;
      }
      if (CONCEPT_TYPES.includes(other.type)) {
        chips.push({ id: other.id, label: other.label, type: other.type });
      }
      backlinks.push({
        id: other.id, label: other.label, type: other.type,
        linkLabel: brain?.linkTypeNames?.[nb.linkType] ?? nb.linkType,
      });
    }

    return { metrics, navHistory, chips, documents: docs, backlinks };
  }, [selectedNode, adjacency, nodeById, fundById, directById, entityById, sponsorById, funds, directInvestments, brain]);

  const selectedMeta = selectedNode ? getGraphMeta(selectedNode.id, selectedNode.type) : undefined;
  const typeName = (type: GraphNodeType) => brain?.nodeTypeSingular?.[type] ?? type;

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden">
      {dims.w > 0 && (
        <ForceGraph2D
          ref={fgRef}
          width={dims.w}
          height={dims.h}
          graphData={data}
          backgroundColor={colors.background}
          nodeId="id"
          nodeRelSize={6}
          nodeCanvasObjectMode={() => "replace"}
          nodeCanvasObject={paintNode}
          nodePointerAreaPaint={paintPointerArea}
          nodeLabel={nodeLabelHtml as any}
          linkColor={linkColor as any}
          linkWidth={linkWidth as any}
          linkLineDash={linkDash as any}
          linkCurvature={(l: any) => (l.linkType === "ownership" ? 0 : 0.12)}
          onNodeClick={onNodeClick as any}
          onNodeRightClick={onNodeRightClick as any}
          onNodeHover={(n: any) => setHoverId(n ? n.id : null)}
          onNodeDragEnd={onNodeDragEnd as any}
          onBackgroundClick={() => setCtxMenu(null)}
          onBackgroundRightClick={() => setCtxMenu(null)}
          cooldownTime={4000}
          d3VelocityDecay={0.3}
        />
      )}

      <GraphControls
        brain={brain}
        nodeTypes={nodeTypes}
        setNodeType={(type, on) => setNodeTypes((p) => ({ ...p, [type]: on }))}
        linkTypes={linkTypes}
        setLinkType={(type, on) => setLinkTypes((p) => ({ ...p, [type]: on }))}
        scope={scope}
        setScope={setScope}
        entities={entities.map((e) => ({ id: e.id, short: e.short, name: e.name }))}
        colorBy={colorBy}
        setColorBy={setColorBy}
        forces={forces}
        setForces={setForces}
        search={search}
        setSearch={setSearch}
        onSearchSubmit={onSearchSubmit}
        onReset={resetView}
        onRecenter={resetView}
      />

      {selectedNode && detail && (
        <NodePanel
          brain={brain}
          node={selectedNode}
          typeName={typeName(selectedNode.type)}
          detail={detail}
          notes={selectedMeta?.notes_text ?? ""}
          canEdit={canEdit}
          riskColor={colors.forNode(selectedNode, "risk", entityIds)}
          onClose={() => setSelectedId(null)}
          onSaveNotes={(text) => saveNotes(selectedNode, text)}
          onFocusNode={focusNode}
          onOpenDetail={(href) => navigate(href)}
        />
      )}

      {ctxMenu && (
        <NodeContextMenu
          brain={brain}
          state={ctxMenu}
          canEdit={canEdit}
          isPinned={!!getGraphMeta(ctxMenu.node.id, ctxMenu.node.type)?.pinned}
          onClose={() => setCtxMenu(null)}
          onOpenDetail={() => { if (ctxMenu.node.href) navigate(ctxMenu.node.href); setCtxMenu(null); }}
          onTogglePin={() => { togglePin(ctxMenu.node); setCtxMenu(null); }}
          onAddNote={() => { setSelectedId(ctxMenu.node.id); setCtxMenu(null); }}
          onHide={() => { hideNode(ctxMenu.node); setCtxMenu(null); }}
          onExpandNeighbors={() => { expandNeighbors(ctxMenu.node); setCtxMenu(null); }}
        />
      )}

      <Minimap fgRef={fgRef} nodes={data.nodes} colors={colors} containerSize={dims} />
    </div>
  );
}
