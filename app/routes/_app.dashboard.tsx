import { useState, useMemo } from "react";
import { useLoaderData, useFetcher, isRouteErrorResponse, Link, useNavigate } from "react-router";
import { api } from "~/lib/api.server";
import { handleUploadAction } from "~/lib/upload.server";
import { getEntityFromRequest } from "~/lib/entity-context";
import type { Fund, Sponsor } from "~/lib/types";
import { formatCurrency, formatMultiplier, formatIrr, irrColor, moicColor } from "~/lib/utils";
import { DashboardSkeleton } from "~/components/ui/Skeleton";
import { UploadModal } from "~/components/ui/UploadModal";
import { SponsorBadge } from "~/components/ui/SponsorBadge";
import { MiniDonut } from "~/components/charts/MiniDonut";
import { ExposureChart } from "~/components/charts/ExposureChart";
import { VintageCharts } from "~/components/charts/VintageCharts";
import { InvestmentCounter } from "~/components/ui/InvestmentCounter";
import { useMergedFunds } from "~/lib/use-merged-data";
import { useClientData } from "~/lib/client-data-context";
import { useT } from "~/lib/use-t";

export async function loader({ request }: { request: Request }) {
  const entityId = getEntityFromRequest(request) || undefined;
  const [funds, sponsors] = await Promise.all([
    api.getFunds(entityId),
    api.getSponsors(entityId),
  ]);
  return { funds, sponsors };
}

export async function action({ request }: { request: Request }) {
  return handleUploadAction(request);
}

export default function Dashboard() {
  const { funds: loaderFunds, sponsors } = useLoaderData<{
    funds: Fund[];
    sponsors: Sponsor[];
  }>();
  // Merge client-added/seed funds so KPIs, charts and the counter stay in
  // sync the moment something is added.
  const funds = useMergedFunds(loaderFunds);
  const { directInvestments } = useClientData();
  const [showUpload, setShowUpload] = useState(false);
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const t = useT();

  // Build sponsor lookup
  const sponsorMap = useMemo(() => {
    const map: Record<string, Sponsor> = {};
    for (const s of sponsors) map[s.id] = s;
    return map;
  }, [sponsors]);

  // Aggregate KPIs from funds
  const agg = useMemo(() => {
    const totalPaidIn = funds.reduce((s, f) => s + f.paid_in, 0);
    const totalNav = funds.reduce((s, f) => s + f.nav, 0);
    const totalUnfunded = funds.reduce((s, f) => s + f.unfunded, 0);
    const totalDistributions = funds.reduce((s, f) => s + f.distributions, 0);
    const totalCommitment = funds.reduce((s, f) => s + f.commitment, 0);

    const w = (key: keyof Fund) =>
      totalPaidIn > 0
        ? funds.reduce((s, f) => s + (f[key] as number) * f.paid_in, 0) / totalPaidIn
        : 0;

    return {
      grossIrr: w("gross_irr"),
      netIrr: w("net_irr"),
      grossMoic: w("gross_moic"),
      netMoic: w("net_moic"),
      tvpi: w("tvpi"),
      dpi: w("dpi"),
      rvpi: w("rvpi"),
      totalNav,
      totalPaidIn,
      totalUnfunded,
      totalDistributions,
      totalCommitment,
    };
  }, [funds]);

  // Donut data
  const geoData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const f of funds) map[f.geography] = (map[f.geography] || 0) + f.nav;
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [funds]);

  const assetData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const f of funds) map[f.asset_class] = (map[f.asset_class] || 0) + f.nav;
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [funds]);

  const themeData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const f of funds)
      for (const c of f.companies) map[c.theme] = (map[c.theme] || 0) + c.fmv;
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({ name, value }));
  }, [funds]);

  const td = t.dashboard;
  const tableHeaders = [
    td.colSponsor, td.colInvestment, td.colClass, td.colStrategy, td.colGeo,
    td.colNav, td.colPctPort, td.colPctAsset,
    td.colGrossIrr, td.colNetIrr, td.colTvpi, td.colDpi, td.colRvpi,
    td.colPaidIn, td.colPctCalled, td.colReport,
  ];
  const leftAlignHeaders: string[] = [td.colSponsor, td.colInvestment, td.colClass, td.colStrategy, td.colGeo];

  return (
    <div className="flex-1 overflow-y-auto p-7 flex flex-col gap-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-[22px] font-bold text-atlas-white font-display">{td.title}</h1>
          <p className="text-[13px] text-atlas-gray3 mt-0.5">
            {td.subtitle(funds.length)}
          </p>
          <div className="mt-2">
            <InvestmentCounter fundCount={funds.length} directCount={directInvestments.length} />
          </div>
        </div>
        <div className="flex gap-2">
          <button className="px-3.5 py-[7px] rounded-lg border border-atlas-border bg-transparent text-atlas-gray2 text-xs cursor-pointer font-medium">
            {td.exportCsv}
          </button>
          <button
            onClick={() => setShowUpload(true)}
            className="px-3.5 py-[7px] rounded-lg border-none bg-atlas-purple text-atlas-white text-xs cursor-pointer font-semibold"
          >
            {td.addDocument}
          </button>
        </div>
      </div>

      {/* Report Alert Banner */}
      {funds.some((f) => !f.report_received) && (
        <div className="bg-atlas-orange-dim border border-atlas-orange/20 rounded-[10px] px-4 py-2.5 flex gap-2.5 items-center">
          <span className="text-atlas-orange text-base">&#x26A0;</span>
          <span className="text-xs text-atlas-gray2">
            <strong className="text-atlas-orange">
              {td.fundsMissingReport(funds.filter((f) => !f.report_received).length)}
            </strong>{" "}
            {td.missingQ4}
          </span>
        </div>
      )}

      {/* Report Delivery Status */}
      <div className="bg-atlas-card border border-atlas-border rounded-[14px] p-5">
        <div className="text-sm font-semibold text-atlas-white mb-3">
          {td.reportDelivery}
        </div>
        <div className="flex flex-wrap gap-2">
          {funds.map((f) => {
            const sp = sponsorMap[f.sponsor_id];
            const shortName = f.name.split(" ").slice(0, 3).join(" ");
            return (
              <Link
                key={f.id}
                to={`/sponsors/${f.sponsor_id}/${f.id}`}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-atlas-border bg-atlas-surface cursor-pointer no-underline hover:border-atlas-border-bright transition-colors"
              >
                {sp && (
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0"
                    style={{ background: sp.color }}
                  >
                    {sp.initials}
                  </div>
                )}
                <span className="text-[11px] text-atlas-gray2 font-medium">{shortName}</span>
                {f.report_received ? (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-atlas-green-dim text-atlas-green font-semibold">
                    {td.onTime}
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-atlas-orange-dim text-atlas-orange font-semibold">
                    {td.missing}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* 10 KPIs */}
      <div className="grid grid-cols-10 gap-2">
        {[
          { label: td.grossIrr, value: `${agg.grossIrr.toFixed(1)}%`, color: irrColor(agg.grossIrr) },
          { label: td.netIrr, value: `${agg.netIrr.toFixed(1)}%`, color: irrColor(agg.netIrr) },
          { label: td.grossMoic, value: formatMultiplier(agg.grossMoic), color: moicColor(agg.grossMoic) },
          { label: td.netMoic, value: formatMultiplier(agg.netMoic), color: moicColor(agg.netMoic) },
          { label: td.tvpi, value: formatMultiplier(agg.tvpi), color: "text-atlas-purple" },
          { label: td.dpi, value: formatMultiplier(agg.dpi), color: "text-atlas-gray1" },
          { label: td.rvpi, value: formatMultiplier(agg.rvpi), color: "text-atlas-gray1" },
          { label: td.totalNav, value: formatCurrency(agg.totalNav), color: "text-atlas-white" },
          { label: td.paidIn, value: formatCurrency(agg.totalPaidIn), color: "text-atlas-white" },
          { label: td.unfunded, value: formatCurrency(agg.totalUnfunded), color: "text-atlas-orange" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-atlas-card border border-atlas-border rounded-xl px-3 py-3">
            <div className="text-[9px] text-atlas-gray3 uppercase tracking-widest mb-1">
              {kpi.label}
            </div>
            <div className={`text-[16px] font-bold font-mono ${kpi.color}`}>
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* 3 Donut charts */}
      <div className="grid grid-cols-3 gap-4">
        <MiniDonut data={geoData} title={td.byGeography} />
        <MiniDonut data={assetData} title={td.byAssetClass} />
        <MiniDonut data={themeData} title={td.topThemes} />
      </div>

      {/* Exposure Analysis */}
      <ExposureChart funds={funds} />

      {/* Vintage distribution + deployment pace */}
      <VintageCharts funds={funds} />

      {/* Investment Table */}
      <div className="bg-atlas-card border border-atlas-border rounded-[14px]">
        <div className="px-5 py-4 border-b border-atlas-border">
          <div className="text-sm font-semibold text-atlas-white">{td.investments}</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-atlas-surface">
                {tableHeaders.map((h) => (
                  <th
                    key={h}
                    className={`py-[9px] px-3 text-[10px] font-semibold text-atlas-gray4 uppercase tracking-wider whitespace-nowrap ${
                      leftAlignHeaders.includes(h)
                        ? "text-left"
                        : "text-right"
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
                const pctPortfolio = agg.totalNav > 0 ? (f.nav / agg.totalNav) * 100 : 0;
                const assetTotal = funds
                  .filter((ff) => ff.asset_class === f.asset_class)
                  .reduce((s, ff) => s + ff.nav, 0);
                const pctAsset = assetTotal > 0 ? (f.nav / assetTotal) * 100 : 0;

                return (
                  <tr
                    key={f.id}
                    onClick={() => navigate(`/sponsors/${f.sponsor_id}/${f.id}`)}
                    className="border-t border-atlas-border cursor-pointer hover:bg-atlas-card-hover transition-colors"
                  >
                    <td className="py-3 px-3">
                      {sp && <SponsorBadge initials={sp.initials} color={sp.color} />}
                    </td>
                    <td className="py-3 px-3">
                      <div className="text-[12px] font-semibold text-atlas-white">{f.name}</div>
                      <div className="text-[10px] text-atlas-gray4">{f.vintage}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-atlas-purple-dim text-atlas-purple-light font-semibold">
                        {f.asset_class}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[11px] text-atlas-gray3">{f.strategy}</td>
                    <td className="py-3 px-3 text-[11px] text-atlas-gray3">{f.geography}</td>
                    <td className="py-3 px-3 text-right text-[12px] text-atlas-white font-medium font-mono">
                      {formatCurrency(f.nav)}
                    </td>
                    <td className="py-3 px-3 text-right text-[11px] text-atlas-gray2 font-mono">
                      {pctPortfolio.toFixed(1)}%
                    </td>
                    <td className="py-3 px-3 text-right text-[11px] text-atlas-gray2 font-mono">
                      {pctAsset.toFixed(1)}%
                    </td>
                    <td className={`py-3 px-3 text-right text-[12px] font-bold font-mono ${irrColor(f.gross_irr)}`} title={formatIrr(f.gross_irr, 4)}>
                      {formatIrr(f.gross_irr)}
                    </td>
                    <td className={`py-3 px-3 text-right text-[12px] font-bold font-mono ${irrColor(f.net_irr)}`} title={formatIrr(f.net_irr, 4)}>
                      {formatIrr(f.net_irr)}
                    </td>
                    <td className="py-3 px-3 text-right text-[12px] font-bold text-atlas-purple font-mono">
                      {formatMultiplier(f.tvpi)}
                    </td>
                    <td className="py-3 px-3 text-right text-[11px] text-atlas-gray2 font-mono">
                      {formatMultiplier(f.dpi)}
                    </td>
                    <td className="py-3 px-3 text-right text-[11px] text-atlas-gray2 font-mono">
                      {formatMultiplier(f.rvpi)}
                    </td>
                    <td className="py-3 px-3 text-right text-[12px] text-atlas-white font-mono">
                      {formatCurrency(f.paid_in)}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-[11px] text-atlas-gray2 font-mono">
                          {f.pct_called.toFixed(0)}%
                        </span>
                        <div className="w-12 h-[4px] bg-atlas-border rounded-sm overflow-hidden">
                          <div
                            className="h-full bg-atlas-purple rounded-sm"
                            style={{ width: `${f.pct_called}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {f.report_received ? (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-atlas-green-dim text-atlas-green font-semibold whitespace-nowrap">
                          {td.onTime}
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-atlas-orange-dim text-atlas-orange font-semibold whitespace-nowrap">
                          {td.missing}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <UploadModal open={showUpload} onClose={() => setShowUpload(false)} fetcher={fetcher} />
    </div>
  );
}

export function HydrateFallback() {
  return <DashboardSkeleton />;
}

export function ErrorBoundary({ error }: { error: unknown }) {
  let message = "Failed to load dashboard data.";
  if (isRouteErrorResponse(error)) {
    message = error.data?.toString() || error.statusText;
  } else if (error instanceof Error) {
    message = error.message;
  }
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <div className="text-2xl font-bold text-atlas-red mb-2">Error</div>
        <div className="text-sm text-atlas-gray3">{message}</div>
      </div>
    </div>
  );
}
