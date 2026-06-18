import { useState, useMemo } from "react";
import { useLoaderData, useNavigate } from "react-router";
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
import { useChartColors } from "~/lib/chart-colors";
import { SponsorBadge } from "~/components/ui/SponsorBadge";
import { MetricDetailPanel } from "~/components/ui/MetricDetailPanel";
import { useT } from "~/lib/use-t";

type MetricType = "grossIrr" | "netIrr" | "tvpi" | "dpi" | "rvpi" | "nav" | "paidIn" | "commitment" | "distributions" | "pctCalled" | "grossMoic" | "netMoic";

export async function loader({ request }: { request: Request }) {
  const entityId = getEntityFromRequest(request) || undefined;
  const cookie = request.headers.get("cookie") || undefined;
  const [funds, sponsors] = await Promise.all([
    api.getFunds(entityId, undefined, cookie),
    api.getSponsors(entityId, cookie),
  ]);
  return { funds, sponsors };
}

export default function Metrics() {
  const { funds, sponsors } = useLoaderData<{
    funds: Fund[];
    sponsors: Sponsor[];
  }>();

  const navigate = useNavigate();
  const cc = useChartColors();
  const t = useT();
  const tm = t.metrics;
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [expandedMetric, setExpandedMetric] = useState<MetricType | null>(null);

  const portfolioAvgIrr = useMemo(() => {
    const totalPaidIn = funds.reduce((s, f) => s + f.paid_in, 0);
    return totalPaidIn > 0 ? funds.reduce((s, f) => s + f.net_irr * f.paid_in, 0) / totalPaidIn : 0;
  }, [funds]);
  const portfolioAvgTvpi = useMemo(() => {
    const totalPaidIn = funds.reduce((s, f) => s + f.paid_in, 0);
    return totalPaidIn > 0 ? funds.reduce((s, f) => s + f.tvpi * f.paid_in, 0) / totalPaidIn : 0;
  }, [funds]);

  const handleMetricClick = (fundId: string, metric: MetricType, e: React.MouseEvent) => {
    e.stopPropagation();
    if (expandedRow === fundId && expandedMetric === metric) {
      setExpandedRow(null);
      setExpandedMetric(null);
    } else {
      setExpandedRow(fundId);
      setExpandedMetric(metric);
    }
  };

  const sponsorMap = useMemo(() => {
    const map: Record<string, Sponsor> = {};
    for (const s of sponsors) map[s.id] = s;
    return map;
  }, [sponsors]);

  // Bar chart data — use translated keys for legend display
  const irrData = useMemo(
    () =>
      funds.map((f) => ({
        name: f.name.length > 20 ? f.name.slice(0, 18) + "\u2026" : f.name,
        [tm.colGrossIrr]: f.gross_irr,
        [tm.colNetIrr]: f.net_irr,
      })),
    [funds, tm]
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

  const tableHeaders = [
    tm.colSponsor, tm.colInvestment, tm.colCommitment, tm.colPaidIn, tm.colPctCalled,
    tm.colNav, tm.colDistributions, tm.colTvpi, tm.colDpi, tm.colRvpi,
    tm.colGrossIrr, tm.colNetIrr, tm.colGrossMoic, tm.colNetMoic, "",
  ];
  const leftAlignHeaders: string[] = [tm.colSponsor, tm.colInvestment];

  // Map column header to metric type for click handling
  const headerToMetric: Record<string, MetricType> = {
    [tm.colCommitment]: "commitment",
    [tm.colPaidIn]: "paidIn",
    [tm.colPctCalled]: "pctCalled",
    [tm.colNav]: "nav",
    [tm.colDistributions]: "distributions",
    [tm.colTvpi]: "tvpi",
    [tm.colDpi]: "dpi",
    [tm.colRvpi]: "rvpi",
    [tm.colGrossIrr]: "grossIrr",
    [tm.colNetIrr]: "netIrr",
    [tm.colGrossMoic]: "grossMoic",
    [tm.colNetMoic]: "netMoic",
  };

  return (
    <div className="flex-1 overflow-y-auto p-7 flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-[22px] font-bold text-atlas-white font-display">{tm.title}</h1>
        <p className="text-[13px] text-atlas-gray3 mt-0.5">
          {tm.subtitle}
        </p>
      </div>

      {/* Methodology Banner */}
      <div className="bg-atlas-purple-dim border border-atlas-purple/20 rounded-[10px] px-4 py-2.5 flex gap-2.5 items-center">
        <span className="text-atlas-purple text-base">&#x2139;</span>
        <span className="text-xs text-atlas-gray2">
          {tm.methodologyText.split("{method}")[0]}
          <strong className="text-atlas-purple">{tm.methodologyRollUp}</strong>
          {tm.methodologyText.split("{method}")[1]}
        </span>
      </div>

      {/* Two Charts Side by Side */}
      <div className="grid grid-cols-2 gap-5">
        {/* Gross vs Net IRR */}
        <div className="bg-atlas-card border border-atlas-border rounded-[14px] p-5">
          <div className="text-sm font-semibold text-atlas-white mb-4">
            {tm.grossVsNetIrr}
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={irrData} margin={{ left: 0, right: 10 }}>
              <XAxis
                dataKey="name"
                tick={{ fill: cc.tick, fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                interval={0}
                angle={-20}
                textAnchor="end"
                height={50}
              />
              <YAxis
                tick={{ fill: cc.tick, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip content={<DarkTip />} cursor={{ fill: cc.cursorFill }} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 11, color: cc.legend }} />
              <Bar dataKey={tm.colGrossIrr} fill={cc.purple} radius={[3, 3, 0, 0]} barSize={16} />
              <Bar dataKey={tm.colNetIrr} fill={cc.blue} radius={[3, 3, 0, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* TVPI / DPI / RVPI */}
        <div className="bg-atlas-card border border-atlas-border rounded-[14px] p-5">
          <div className="text-sm font-semibold text-atlas-white mb-4">
            {tm.tvpiDpiRvpi}
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={multData} margin={{ left: 0, right: 10 }}>
              <XAxis
                dataKey="name"
                tick={{ fill: cc.tick, fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                interval={0}
                angle={-20}
                textAnchor="end"
                height={50}
              />
              <YAxis
                tick={{ fill: cc.tick, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}x`}
              />
              <Tooltip content={<DarkTip />} cursor={{ fill: cc.cursorFill }} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 11, color: cc.legend }} />
              <Bar dataKey="TVPI" fill={cc.purple} radius={[3, 3, 0, 0]} barSize={12} />
              <Bar dataKey="DPI" fill={cc.green} radius={[3, 3, 0, 0]} barSize={12} />
              <Bar dataKey="RVPI" fill={cc.blue} radius={[3, 3, 0, 0]} barSize={12} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Expanded Metrics Table */}
      <div className="bg-atlas-card border border-atlas-border rounded-[14px]">
        <div className="px-5 py-3.5 border-b border-atlas-border text-sm font-semibold text-atlas-white">
          {tm.fundLevelMetrics}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[1100px]">
            <thead>
              <tr className="bg-atlas-surface">
                {tableHeaders.map((h) => (
                  <th
                    key={h}
                    className={`py-[9px] px-3 text-[10px] font-semibold text-atlas-gray4 uppercase tracking-wider whitespace-nowrap ${
                      leftAlignHeaders.includes(h) ? "text-left" : "text-right"
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
                const cells: { value: string; cls: string; metric: MetricType; title?: string }[] = [
                  { value: formatCurrency(f.commitment), cls: "text-right text-xs text-atlas-gray2 font-mono", metric: "commitment" },
                  { value: formatCurrency(f.paid_in), cls: "text-right text-xs text-atlas-white font-mono", metric: "paidIn" },
                  { value: `${f.pct_called.toFixed(0)}%`, cls: "text-right text-xs text-atlas-gray2 font-mono", metric: "pctCalled" },
                  { value: formatCurrency(f.nav), cls: "text-right text-xs text-atlas-white font-mono", metric: "nav" },
                  { value: formatCurrency(f.distributions), cls: "text-right text-xs text-atlas-gray2 font-mono", metric: "distributions" },
                  { value: formatMultiplier(f.tvpi), cls: "text-right text-[12px] font-bold text-atlas-purple font-mono", metric: "tvpi" },
                  { value: formatMultiplier(f.dpi), cls: "text-right text-xs text-atlas-gray2 font-mono", metric: "dpi" },
                  { value: formatMultiplier(f.rvpi), cls: "text-right text-xs text-atlas-gray2 font-mono", metric: "rvpi" },
                  { value: formatIrr(f.gross_irr), cls: `text-right text-[12px] font-bold font-mono ${irrColor(f.gross_irr)}`, metric: "grossIrr", title: formatIrr(f.gross_irr, 4) },
                  { value: formatIrr(f.net_irr), cls: `text-right text-[12px] font-bold font-mono ${irrColor(f.net_irr)}`, metric: "netIrr", title: formatIrr(f.net_irr, 4) },
                  { value: formatMultiplier(f.gross_moic), cls: "text-right text-xs text-atlas-gray2 font-mono", metric: "grossMoic" },
                  { value: formatMultiplier(f.net_moic), cls: "text-right text-xs text-atlas-gray2 font-mono", metric: "netMoic" },
                ];
                return (
                  <>
                    <tr
                      key={f.id}
                      onClick={() => navigate(`/sponsors/${f.sponsor_id}/${f.id}`)}
                      className="border-t border-atlas-border cursor-pointer hover:bg-atlas-card-hover transition-colors"
                    >
                      <td className="py-[11px] px-3">
                        {sp && <SponsorBadge initials={sp.initials} color={sp.color} />}
                      </td>
                      <td className="py-[11px] px-3 text-[12px] font-semibold text-atlas-white">
                        {f.name}
                      </td>
                      {cells.map((c) => (
                        <td
                          key={c.metric}
                          className={`py-[11px] px-3 ${c.cls}`}
                          title={c.title}
                          onClick={(e) => handleMetricClick(f.id, c.metric, e)}
                        >
                          <span className="hover:bg-atlas-purple-dim rounded px-1 -mx-1 transition-colors cursor-pointer">
                            {c.value}
                          </span>
                        </td>
                      ))}
                      <td className="py-[11px] px-2 text-atlas-gray4 text-sm">&rsaquo;</td>
                    </tr>
                    {expandedRow === f.id && expandedMetric && (
                      <tr key={`${f.id}-detail`}>
                        <td colSpan={16} className="p-0">
                          <div className="overflow-hidden transition-all duration-250 ease-in-out">
                            <MetricDetailPanel
                              fund={f}
                              metric={expandedMetric}
                              portfolioAvgIrr={portfolioAvgIrr}
                              portfolioAvgTvpi={portfolioAvgTvpi}
                              onClose={() => { setExpandedRow(null); setExpandedMetric(null); }}
                            />
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
