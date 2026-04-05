import { useState, useMemo, useCallback } from "react";
import { useLoaderData, useNavigate, useRevalidator } from "react-router";
import { api } from "~/lib/api.server";
import { getEntityFromRequest, useEntity } from "~/lib/entity-context";
import { useClientData } from "~/lib/client-data-context";
import { useMergedFunds } from "~/lib/use-merged-data";
import type { Entity, Fund, Sponsor } from "~/lib/types";
import { formatCurrency, formatMultiplier, formatIrr } from "~/lib/utils";
import { useT } from "~/lib/use-t";

export async function loader({ request }: { request: Request }) {
  const entityId = getEntityFromRequest(request) || undefined;
  const [entities, funds, sponsors] = await Promise.all([
    api.getEntities(),
    api.getFunds(entityId),
    api.getSponsors(entityId),
  ]);
  return { entities, funds, sponsors };
}

export default function EntityMap() {
  const data = useLoaderData<{ entities: Entity[]; funds: Fund[]; sponsors: Sponsor[] }>();
  const funds = useMergedFunds(data.funds);
  const { selectedEntityId } = useEntity();
  const revalidator = useRevalidator();
  const navigate = useNavigate();
  const t = useT();
  const te = t.entityMap;

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [reassignFundId, setReassignFundId] = useState<string | null>(null);
  const [reassignTarget, setReassignTarget] = useState<string>("");
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);
  const { updateFundEntity } = useClientData();

  const sponsorMap = useMemo(() => {
    const map: Record<string, Sponsor> = {};
    for (const s of data.sponsors) map[s.id] = s;
    return map;
  }, [data.sponsors]);

  const entities = useMemo(() => {
    if (selectedEntityId) return data.entities.filter((e) => e.id === selectedEntityId);
    return data.entities;
  }, [data.entities, selectedEntityId]);

  // Group funds by entity
  const fundsByEntity = useMemo(() => {
    const map: Record<string, Fund[]> = {};
    for (const e of data.entities) map[e.id] = [];
    for (const f of funds) {
      if (map[f.entity_id]) map[f.entity_id].push(f);
    }
    return map;
  }, [funds, data.entities]);

  const toggleExpand = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const expandAll = () => {
    const all = new Set<string>();
    for (const f of funds) all.add(f.id);
    setExpanded(all);
  };
  const collapseAll = () => setExpanded(new Set());

  const selectEntity = (id: string | null) => {
    document.cookie = `atlas-entity=${id || ""}; path=/; max-age=31536000`;
    revalidator.revalidate();
  };

  const handleFundClick = (f: Fund, e: React.MouseEvent) => {
    if (e.shiftKey) {
      setReassignFundId(f.id);
      setReassignTarget(f.entity_id);
    } else if (expanded.has(f.id)) {
      toggleExpand(f.id);
    } else {
      navigate(`/sponsors/${f.sponsor_id}/${f.id}`);
    }
  };

  const confirmReassign = () => {
    if (reassignFundId && reassignTarget) {
      updateFundEntity(reassignFundId, reassignTarget);
      setReassignFundId(null);
    }
  };

  // Layout computation
  const NODE = { root: { w: 180, h: 60 }, entity: { w: 150, h: 56 }, fund: { w: 130, h: 46 }, co: { r: 24 } };
  const LEVEL_GAP = 130;
  const SIBLING_GAP = 20;

  const layout = useMemo(() => {
    const nodes: Array<{ id: string; type: string; x: number; y: number; w: number; h: number; parentId?: string; data: any }> = [];
    const lines: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];

    // Root
    const rootY = 40;
    nodes.push({ id: "root", type: "root", x: 0, y: rootY, w: NODE.root.w, h: NODE.root.h, data: null });

    // Calculate total width needed
    let totalEntityWidth = 0;
    const entityWidths: number[] = [];
    for (const ent of entities) {
      const entFunds = fundsByEntity[ent.id] || [];
      let entityW = NODE.entity.w;
      if (entFunds.length > 0) {
        const fundsW = entFunds.length * (NODE.fund.w + SIBLING_GAP) - SIBLING_GAP;
        entityW = Math.max(entityW, fundsW);
      }
      entityWidths.push(entityW);
      totalEntityWidth += entityW;
    }
    totalEntityWidth += (entities.length - 1) * SIBLING_GAP * 2;

    // Position entities centered under root
    let entityStartX = -totalEntityWidth / 2;
    entities.forEach((ent, ei) => {
      const entityCenterX = entityStartX + entityWidths[ei] / 2;
      const entityY = rootY + NODE.root.h + LEVEL_GAP;
      nodes.push({
        id: ent.id, type: "entity", x: entityCenterX, y: entityY,
        w: NODE.entity.w, h: NODE.entity.h, parentId: "root", data: ent,
      });
      lines.push({ x1: 0, y1: rootY + NODE.root.h, x2: entityCenterX, y2: entityY });

      // Funds under this entity
      const entFunds = fundsByEntity[ent.id] || [];
      const fundsW = entFunds.length * (NODE.fund.w + SIBLING_GAP) - SIBLING_GAP;
      let fundStartX = entityCenterX - fundsW / 2;
      const fundY = entityY + NODE.entity.h + LEVEL_GAP;

      entFunds.forEach((fund) => {
        const fundCenterX = fundStartX + NODE.fund.w / 2;
        nodes.push({
          id: fund.id, type: "fund", x: fundCenterX, y: fundY,
          w: NODE.fund.w, h: NODE.fund.h, parentId: ent.id, data: fund,
        });
        lines.push({ x1: entityCenterX, y1: entityY + NODE.entity.h, x2: fundCenterX, y2: fundY });

        // Companies (if expanded)
        if (expanded.has(fund.id) && fund.companies.length > 0) {
          const coR = NODE.co.r;
          const coDiam = coR * 2;
          const cosW = fund.companies.length * (coDiam + SIBLING_GAP) - SIBLING_GAP;
          let coStartX = fundCenterX - cosW / 2;
          const coY = fundY + NODE.fund.h + LEVEL_GAP;

          fund.companies.forEach((co) => {
            const coCenterX = coStartX + coR;
            nodes.push({
              id: `${fund.id}-${co.name}`, type: "company", x: coCenterX, y: coY,
              w: coDiam, h: coDiam, parentId: fund.id, data: co,
            });
            lines.push({ x1: fundCenterX, y1: fundY + NODE.fund.h, x2: coCenterX, y2: coY });
            coStartX += coDiam + SIBLING_GAP;
          });
        }

        fundStartX += NODE.fund.w + SIBLING_GAP;
      });

      entityStartX += entityWidths[ei] + SIBLING_GAP * 2;
    });

    // Compute viewBox
    let minX = Infinity, maxX = -Infinity, maxY = 0;
    for (const n of nodes) {
      minX = Math.min(minX, n.x - n.w / 2);
      maxX = Math.max(maxX, n.x + n.w / 2);
      maxY = Math.max(maxY, n.y + n.h);
    }
    const pad = 40;
    return { nodes, lines, viewBox: { x: minX - pad, y: 0, w: maxX - minX + pad * 2, h: maxY + pad * 2 } };
  }, [entities, fundsByEntity, expanded, funds]);

  const reassignFund = reassignFundId ? funds.find((f) => f.id === reassignFundId) : null;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Controls bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-atlas-border shrink-0">
        <div className="flex gap-2">
          <button
            onClick={() => selectEntity(null)}
            className={`px-3 py-[5px] rounded-full border text-xs font-semibold cursor-pointer transition-colors ${
              !selectedEntityId
                ? "border-atlas-purple bg-atlas-purple-dim text-atlas-purple"
                : "border-atlas-border bg-transparent text-atlas-gray3 hover:border-atlas-gray4"
            }`}
          >
            {t.topbar.all}
          </button>
          {data.entities.map((e) => (
            <button
              key={e.id}
              onClick={() => selectEntity(e.id)}
              className={`px-3 py-[5px] rounded-full border text-xs font-semibold cursor-pointer transition-colors ${
                selectedEntityId === e.id
                  ? "border-atlas-purple bg-atlas-purple-dim text-atlas-purple"
                  : "border-atlas-border bg-transparent text-atlas-gray3 hover:border-atlas-gray4"
              }`}
            >
              {e.short}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={expandAll} className="px-3 py-[5px] rounded-lg border border-atlas-border bg-transparent text-atlas-gray2 text-xs font-medium cursor-pointer hover:border-atlas-gray4 transition-colors">
            {te.expandAll}
          </button>
          <button onClick={collapseAll} className="px-3 py-[5px] rounded-lg border border-atlas-border bg-transparent text-atlas-gray2 text-xs font-medium cursor-pointer hover:border-atlas-gray4 transition-colors">
            {te.collapseAll}
          </button>
          <button className="px-3 py-[5px] rounded-lg border border-atlas-border bg-transparent text-atlas-gray4 text-xs font-medium cursor-default">
            {te.editStructure}
          </button>
        </div>
      </div>

      {/* SVG Map */}
      <div className="flex-1 overflow-auto relative">
        <svg
          viewBox={`${layout.viewBox.x} ${layout.viewBox.y} ${layout.viewBox.w} ${layout.viewBox.h}`}
          className="w-full min-h-full"
          style={{ minWidth: layout.viewBox.w, minHeight: layout.viewBox.h }}
        >
          {/* Lines */}
          {layout.lines.map((l, i) => (
            <path
              key={i}
              d={`M ${l.x1} ${l.y1} C ${l.x1} ${l.y1 + 50}, ${l.x2} ${l.y2 - 50}, ${l.x2} ${l.y2}`}
              fill="none"
              stroke="var(--color-atlas-border-bright)"
              strokeWidth="1"
            />
          ))}

          {/* Nodes */}
          {layout.nodes.map((n) => {
            if (n.type === "root") {
              return (
                <g key={n.id}>
                  <rect
                    x={n.x - n.w / 2} y={n.y} width={n.w} height={n.h} rx={12}
                    fill="var(--color-atlas-purple-dim)" stroke="var(--color-atlas-purple)" strokeWidth="2"
                  />
                  <text x={n.x} y={n.y + 24} textAnchor="middle" fill="var(--color-atlas-white)" fontSize="13" fontWeight="700" fontFamily="Syne">
                    {te.rootLabel}
                  </text>
                  <text x={n.x} y={n.y + 42} textAnchor="middle" fill="var(--color-atlas-gray3)" fontSize="10" fontFamily="DM Sans">
                    {te.rootSub}
                  </text>
                </g>
              );
            }
            if (n.type === "entity") {
              const ent = n.data as Entity;
              return (
                <g key={n.id} className="cursor-pointer" onClick={() => selectEntity(ent.id)}
                  onMouseEnter={(e) => setTooltip({ x: e.clientX, y: e.clientY, content: `NAV: ${formatCurrency(ent.nav)} · Funds: ${(fundsByEntity[ent.id] || []).length}` })}
                  onMouseLeave={() => setTooltip(null)}
                >
                  <rect
                    x={n.x - n.w / 2} y={n.y} width={n.w} height={n.h} rx={10}
                    fill="var(--color-atlas-card)" stroke="var(--color-atlas-purple)" strokeWidth="2"
                  />
                  <text x={n.x} y={n.y + 20} textAnchor="middle" fill="var(--color-atlas-white)" fontSize="13" fontWeight="700" fontFamily="DM Sans">
                    {ent.short}
                  </text>
                  <text x={n.x} y={n.y + 33} textAnchor="middle" fill="var(--color-atlas-gray3)" fontSize="9" fontFamily="DM Sans">
                    {ent.name.length > 22 ? ent.name.slice(0, 20) + "\u2026" : ent.name}
                  </text>
                  <text x={n.x} y={n.y + 48} textAnchor="middle" fill="var(--color-atlas-purple)" fontSize="11" fontWeight="600" fontFamily="IBM Plex Mono">
                    {formatCurrency(ent.nav)}
                  </text>
                </g>
              );
            }
            if (n.type === "fund") {
              const fund = n.data as Fund;
              const sp = sponsorMap[fund.sponsor_id];
              const strokeColor = sp?.color || "var(--color-atlas-border)";
              const shortName = fund.name.split(" ").slice(0, 3).join(" ");
              return (
                <g key={n.id} className="cursor-pointer"
                  onClick={(e) => handleFundClick(fund, e as unknown as React.MouseEvent)}
                  onMouseEnter={(e) => setTooltip({ x: e.clientX, y: e.clientY, content: `Net IRR: ${formatIrr(fund.net_irr)} · TVPI: ${formatMultiplier(fund.tvpi)} · NAV: ${formatCurrency(fund.nav)} · % Called: ${fund.pct_called.toFixed(0)}%` })}
                  onMouseLeave={() => setTooltip(null)}
                >
                  <rect
                    x={n.x - n.w / 2} y={n.y} width={n.w} height={n.h} rx={8}
                    fill="var(--color-atlas-card)" stroke={strokeColor} strokeWidth="1.5"
                  />
                  <text x={n.x} y={n.y + 18} textAnchor="middle" fill="var(--color-atlas-white)" fontSize="10" fontWeight="600" fontFamily="DM Sans">
                    {shortName.length > 18 ? shortName.slice(0, 16) + "\u2026" : shortName}
                  </text>
                  <text x={n.x} y={n.y + 30} textAnchor="middle" fill="var(--color-atlas-gray3)" fontSize="8" fontFamily="DM Sans">
                    {fund.asset_class}
                  </text>
                  <text x={n.x} y={n.y + 42} textAnchor="middle" fill="var(--color-atlas-purple)" fontSize="10" fontWeight="500" fontFamily="IBM Plex Mono">
                    {formatCurrency(fund.nav)}
                  </text>
                </g>
              );
            }
            if (n.type === "company") {
              const co = n.data;
              const parentFund = funds.find((f) => n.parentId === f.id);
              const sp = parentFund ? sponsorMap[parentFund.sponsor_id] : null;
              return (
                <g key={n.id}
                  onMouseEnter={(e) => setTooltip({ x: e.clientX, y: e.clientY, content: `MOIC: ${formatMultiplier(co.moic)} · IRR: ${formatIrr(co.irr)} · Status: ${co.status}` })}
                  onMouseLeave={() => setTooltip(null)}
                >
                  <circle
                    cx={n.x} cy={n.y + NODE.co.r} r={NODE.co.r}
                    fill="var(--color-atlas-surface)" stroke={sp?.color || "var(--color-atlas-border)"} strokeWidth="1.5"
                  />
                  <text x={n.x} y={n.y + NODE.co.r - 4} textAnchor="middle" fill="var(--color-atlas-gray2)" fontSize="8" fontFamily="DM Sans">
                    {co.name.length > 8 ? co.name.slice(0, 7) + "\u2026" : co.name}
                  </text>
                  <text x={n.x} y={n.y + NODE.co.r + 8} textAnchor="middle" fill="var(--color-atlas-white)" fontSize="10" fontWeight="600" fontFamily="IBM Plex Mono">
                    {formatMultiplier(co.moic)}
                  </text>
                </g>
              );
            }
            return null;
          })}
        </svg>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="fixed bg-atlas-tooltip-bg border border-atlas-border rounded-lg px-3 py-2 text-[11px] text-atlas-off-white font-sans shadow-lg z-[200] pointer-events-none"
            style={{ left: tooltip.x + 12, top: tooltip.y + 12 }}
          >
            {tooltip.content}
          </div>
        )}

        {/* Reassign Panel */}
        {reassignFund && (
          <div className="absolute right-5 top-5 w-[240px] bg-atlas-card border border-atlas-border rounded-xl p-4 z-[100] shadow-lg">
            <div className="text-[13px] font-bold text-atlas-white font-display mb-3">{te.reassignFund}</div>
            <div className="text-[11px] text-atlas-gray3 mb-1">{te.currentEntity}</div>
            <div className="text-[12px] text-atlas-white font-medium mb-3">
              {data.entities.find((e) => e.id === reassignFund.entity_id)?.short || "—"}
            </div>
            <div className="text-[11px] text-atlas-gray3 mb-1">{te.moveTo}</div>
            <select
              value={reassignTarget}
              onChange={(e) => setReassignTarget(e.target.value)}
              className="w-full bg-atlas-surface border border-atlas-border rounded-lg px-3 py-2 text-[12px] text-atlas-white outline-none cursor-pointer appearance-none mb-3"
            >
              {data.entities.map((e) => (
                <option key={e.id} value={e.id}>{e.short} — {e.name}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button onClick={confirmReassign} className="flex-1 py-2 rounded-lg bg-atlas-purple text-atlas-white text-[12px] font-semibold cursor-pointer border-none">
                {te.confirm}
              </button>
              <button onClick={() => setReassignFundId(null)} className="flex-1 py-2 rounded-lg bg-transparent border border-atlas-border text-atlas-gray2 text-[12px] font-medium cursor-pointer">
                {te.cancel}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
