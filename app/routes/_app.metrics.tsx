import { useMemo } from "react";
import { useLoaderData } from "react-router";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { api } from "~/lib/api.server";
import { getEntityFromRequest } from "~/lib/entity-context";
import type { Fund, Sponsor } from "~/lib/types";
import { formatCurrency, formatMultiplier, formatIrr, irrColor } from "~/lib/utils";
import { DarkTip } from "~/components/charts/DarkTip";
import { SponsorBadge } from "~/components/ui/SponsorBadge";

export async function loader({ request }: { request: Request }) {
  const entityId = getEntityFromRequest(request) || undefined;
  const [funds, sponsors] = await Promise.all([
    api.getFunds(entityId),
    api.getSponsors(entityId),
  ]);
  return { funds, sponsors };
}

export default function Metrics() {
  const { funds, sponsors } = useLoaderData<{
    funds: Fund[];
    sponsors: Sponsor[];
  }>();

  const sponsorMap = useMemo(() => {
    const map: Record<string, Sponsor> = {};
    for (const s of sponsors) map[s.id] = s;
    return map;
  }, [sponsors]);

  // Bar chart data
  const irrData = useMemo(
    () =>
      funds.map((f) => ({
        name: f.name.length > 20 ? f.name.slice(0, 18) + "\u2026" : f.name,
        "Gross IRR": f.gross_irr,
        "Net IRR": f.net_irr,
      })),
    [funds]
  );

  const multData = useMemo(
    () =>
      funds.map((f) => ({
        name: f.name.length > 20 ? f.name.slice(0, 18) + "\u2026" : f.name,
        TVPI: f.tvpi,
        DPI: f.dpi,
        RVPI: f.rvpi,
      })),
    [funds]
  );

  return (
    <div className="flex-1 overflow-y-auto p-7 flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-[22px] font-bold text-atlas-white font-display">Performance Metrics</h1>
        <p className="text-[13px] text-atlas-gray3 mt-0.5">
          IRR via XIRR &middot; Paid-In weighted roll-ups &middot; As of March 5, 2026
        </p>
      </div>

      {/* Methodology Banner */}
      <div className="bg-atlas-purple-dim border border-atlas-purple/20 rounded-[10px] px-4 py-2.5 flex gap-2.5 items-center">
        <span className="text-atlas-purple text-base">&#x2139;</span>
        <span className="text-xs text-atlas-gray2">
          Roll-up method: <strong className="text-atlas-purple">Paid-In weighted</strong>. IRR
          calculated via XIRR on dated cash flows. NAV used as terminal value for unrealized
          positions.
        </span>
      </div>

      {/* Two Charts Side by Side */}
      <div className="grid grid-cols-2 gap-5">
        {/* Gross vs Net IRR */}
        <div className="bg-atlas-card border border-atlas-border rounded-[14px] p-5">
          <div className="text-sm font-semibold text-atlas-white mb-4">
            Gross vs Net IRR by Fund
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={irrData} margin={{ left: 0, right: 10 }}>
              <XAxis
                dataKey="name"
                tick={{ fill: "#505068", fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                interval={0}
                angle={-20}
                textAnchor="end"
                height={50}
              />
              <YAxis
                tick={{ fill: "#505068", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip content={<DarkTip />} cursor={{ fill: "rgba(139,123,216,0.06)" }} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 11, color: "#8080A0" }} />
              <Bar dataKey="Gross IRR" fill="#8B7BD8" radius={[3, 3, 0, 0]} barSize={16} />
              <Bar dataKey="Net IRR" fill="#4DA8FF" radius={[3, 3, 0, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* TVPI / DPI / RVPI */}
        <div className="bg-atlas-card border border-atlas-border rounded-[14px] p-5">
          <div className="text-sm font-semibold text-atlas-white mb-4">
            TVPI / DPI / RVPI by Fund
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={multData} margin={{ left: 0, right: 10 }}>
              <XAxis
                dataKey="name"
                tick={{ fill: "#505068", fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                interval={0}
                angle={-20}
                textAnchor="end"
                height={50}
              />
              <YAxis
                tick={{ fill: "#505068", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}x`}
              />
              <Tooltip content={<DarkTip />} cursor={{ fill: "rgba(139,123,216,0.06)" }} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 11, color: "#8080A0" }} />
              <Bar dataKey="TVPI" fill="#8B7BD8" radius={[3, 3, 0, 0]} barSize={12} />
              <Bar dataKey="DPI" fill="#00E5A0" radius={[3, 3, 0, 0]} barSize={12} />
              <Bar dataKey="RVPI" fill="#4DA8FF" radius={[3, 3, 0, 0]} barSize={12} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Expanded Metrics Table */}
      <div className="bg-atlas-card border border-atlas-border rounded-[14px]">
        <div className="px-5 py-3.5 border-b border-atlas-border text-sm font-semibold text-atlas-white">
          Fund-Level Metrics
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[1100px]">
            <thead>
              <tr className="bg-atlas-surface">
                {[
                  "Sponsor", "Investment", "Commitment", "Paid-In", "% Called",
                  "NAV", "Distributions", "TVPI", "DPI", "RVPI",
                  "Gross IRR", "Net IRR", "Gross MOIC", "Net MOIC",
                ].map((h) => (
                  <th
                    key={h}
                    className={`py-[9px] px-3 text-[10px] font-semibold text-atlas-gray4 uppercase tracking-wider whitespace-nowrap ${
                      ["Sponsor", "Investment"].includes(h) ? "text-left" : "text-right"
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {funds.map((f) => {
                const sp = sponsorMap[f.sponsor_id];
                return (
                  <tr key={f.id} className="border-t border-atlas-border">
                    <td className="py-[11px] px-3">
                      {sp && <SponsorBadge initials={sp.initials} color={sp.color} />}
                    </td>
                    <td className="py-[11px] px-3 text-[12px] font-semibold text-atlas-white">
                      {f.name}
                    </td>
                    <td className="py-[11px] px-3 text-right text-xs text-atlas-gray2 font-mono">
                      {formatCurrency(f.commitment)}
                    </td>
                    <td className="py-[11px] px-3 text-right text-xs text-atlas-white font-mono">
                      {formatCurrency(f.paid_in)}
                    </td>
                    <td className="py-[11px] px-3 text-right text-xs text-atlas-gray2 font-mono">
                      {f.pct_called.toFixed(0)}%
                    </td>
                    <td className="py-[11px] px-3 text-right text-xs text-atlas-white font-mono">
                      {formatCurrency(f.nav)}
                    </td>
                    <td className="py-[11px] px-3 text-right text-xs text-atlas-gray2 font-mono">
                      {formatCurrency(f.distributions)}
                    </td>
                    <td className="py-[11px] px-3 text-right text-[12px] font-bold text-atlas-purple font-mono">
                      {formatMultiplier(f.tvpi)}
                    </td>
                    <td className="py-[11px] px-3 text-right text-xs text-atlas-gray2 font-mono">
                      {formatMultiplier(f.dpi)}
                    </td>
                    <td className="py-[11px] px-3 text-right text-xs text-atlas-gray2 font-mono">
                      {formatMultiplier(f.rvpi)}
                    </td>
                    <td className={`py-[11px] px-3 text-right text-[12px] font-bold font-mono ${irrColor(f.gross_irr)}`}>
                      {formatIrr(f.gross_irr)}
                    </td>
                    <td className={`py-[11px] px-3 text-right text-[12px] font-bold font-mono ${irrColor(f.net_irr)}`}>
                      {formatIrr(f.net_irr)}
                    </td>
                    <td className="py-[11px] px-3 text-right text-xs text-atlas-gray2 font-mono">
                      {formatMultiplier(f.gross_moic)}
                    </td>
                    <td className="py-[11px] px-3 text-right text-xs text-atlas-gray2 font-mono">
                      {formatMultiplier(f.net_moic)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
