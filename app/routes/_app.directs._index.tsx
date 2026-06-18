import { useState, useMemo } from "react";
import { useLoaderData, useNavigate } from "react-router";
import { api } from "~/lib/api.server";
import { getEntityFromRequest, useEntity } from "~/lib/entity-context";
import { useClientData } from "~/lib/client-data-context";
import { useMergedFunds } from "~/lib/use-merged-data";
import { useCan } from "~/lib/use-permissions";
import { useT } from "~/lib/use-t";
import { formatCurrency, formatMultiplier } from "~/lib/utils";
import { InvestmentCounter } from "~/components/ui/InvestmentCounter";
import { RiskDot } from "~/components/drawers/form-fields";
import { AddDirectInvestmentDrawer } from "~/components/drawers/AddDirectInvestmentDrawer";
import type { Fund } from "~/lib/types";

export async function loader({ request }: { request: Request }) {
  const entityId = getEntityFromRequest(request) || undefined;
  const cookie = request.headers.get("cookie") || undefined;
  let funds: Fund[] = [];
  try {
    funds = await api.getFunds(entityId, undefined, cookie);
  } catch {
    /* backend down — degrade */
  }
  return { funds };
}

export default function DirectsIndex() {
  const { funds: loaderFunds } = useLoaderData<{ funds: Fund[] }>();
  const funds = useMergedFunds(loaderFunds);
  const { directInvestments } = useClientData();
  const { selectedEntityId, entities } = useEntity();
  const navigate = useNavigate();
  const cn = useCan();
  const t = useT();
  const tdir = t.directs;
  const [showAdd, setShowAdd] = useState(false);

  const entityName = useMemo(() => {
    const m: Record<string, string> = {};
    for (const e of entities) m[e.id] = e.short;
    return m;
  }, [entities]);

  const directs = useMemo(
    () =>
      selectedEntityId
        ? directInvestments.filter((d) => d.entity_id === selectedEntityId)
        : directInvestments,
    [directInvestments, selectedEntityId]
  );

  const fundCount = selectedEntityId
    ? funds.filter((f) => f.entity_id === selectedEntityId).length
    : funds.length;

  return (
    <div className="flex-1 overflow-y-auto p-7 flex flex-col gap-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-[22px] font-bold text-atlas-white font-display">{tdir.title}</h1>
          <p className="text-[13px] text-atlas-gray3 mt-0.5">{tdir.subtitle}</p>
          <div className="mt-2">
            <InvestmentCounter fundCount={fundCount} directCount={directs.length} />
          </div>
        </div>
        {cn("direct.add") && (
          <button
            onClick={() => setShowAdd(true)}
            className="px-[18px] py-[9px] rounded-lg border-none bg-atlas-purple text-atlas-white text-[13px] cursor-pointer font-semibold hover:opacity-90 transition-opacity"
          >
            + {tdir.addDirect}
          </button>
        )}
      </div>

      {directs.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-sm">
            <div className="text-[40px] mb-2 text-atlas-gray4">◆</div>
            <div className="text-[14px] font-semibold text-atlas-white mb-1">{tdir.empty}</div>
            {cn("direct.add") && (
              <button
                onClick={() => setShowAdd(true)}
                className="mt-3 px-4 py-2 rounded-lg bg-atlas-purple text-atlas-white text-[12px] font-semibold cursor-pointer border-none"
              >
                {tdir.emptyCta}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-atlas-card border border-atlas-border rounded-[14px]">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-atlas-surface">
                {[tdir.colCompany, tdir.colSector, tdir.colClass, tdir.colStage, tdir.colEntity, tdir.colCost, tdir.colValuation, tdir.colMoic, tdir.colOwn, tdir.colRisk].map((h) => (
                  <th key={h} className="py-[9px] px-3.5 text-left text-[10.5px] font-semibold text-atlas-gray4 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {directs.map((d) => {
                const moic = d.cost > 0 ? d.valuation / d.cost : 0;
                return (
                  <tr
                    key={d.id}
                    onClick={() => navigate(`/directs/${d.id}`)}
                    className="border-t border-atlas-border cursor-pointer hover:bg-atlas-card-hover transition-colors"
                  >
                    <td className="py-3 px-3.5 text-[12.5px] font-semibold text-atlas-white">{d.name}</td>
                    <td className="py-3 px-3.5 text-[11.5px] text-atlas-gray2">{d.sector}</td>
                    <td className="py-3 px-3.5 text-[11.5px] text-atlas-gray3">{d.asset_class}</td>
                    <td className="py-3 px-3.5 text-[11.5px] text-atlas-gray3">{d.stage}</td>
                    <td className="py-3 px-3.5 text-[11.5px] text-atlas-gray3">{entityName[d.entity_id] || "—"}</td>
                    <td className="py-3 px-3.5 text-[11.5px] text-atlas-gray2 font-mono">{formatCurrency(d.cost)}</td>
                    <td className="py-3 px-3.5 text-[11.5px] text-atlas-white font-mono font-semibold">{formatCurrency(d.valuation)}</td>
                    <td className="py-3 px-3.5 text-[11.5px] font-mono font-bold text-atlas-purple-light">{formatMultiplier(moic)}</td>
                    <td className="py-3 px-3.5 text-[11.5px] text-atlas-gray2 font-mono">{d.ownership_pct.toFixed(1)}%</td>
                    <td className="py-3 px-3.5"><RiskDot value={d.risk_rating} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <AddDirectInvestmentDrawer open={showAdd} onClose={() => setShowAdd(false)} />
    </div>
  );
}
