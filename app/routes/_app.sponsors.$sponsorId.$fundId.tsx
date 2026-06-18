import { useState, useMemo } from "react";
import { useLoaderData, Link } from "react-router";
import { api } from "~/lib/api.server";
import { useMergedCompanies } from "~/lib/use-merged-data";
import { useClientData } from "~/lib/client-data-context";
import { useDocViewer } from "~/lib/doc-viewer-context";
import type { Fund, Sponsor, Document } from "~/lib/types";
import { formatCurrency, formatMultiplier, formatIrr, irrColor, moicColor } from "~/lib/utils";
import { SponsorBadge } from "~/components/ui/SponsorBadge";
import { StatusBadge } from "~/components/ui/StatusBadge";
import { MiniDonut } from "~/components/charts/MiniDonut";
import { CashflowChart } from "~/components/charts/CashflowChart";
import { NavHistoryChart } from "~/components/charts/NavHistoryChart";
import { EquityDeploymentChart, buildFundJCurve } from "~/components/charts/EquityDeploymentChart";
import { PerformanceIndicator } from "~/components/charts/PerformanceIndicator";
import { AddCompanyDrawer } from "~/components/drawers/AddCompanyDrawer";
import { useToast } from "~/lib/toast-context";
import { useCan } from "~/lib/use-permissions";
import { useT } from "~/lib/use-t";

export async function loader({
  request,
  params,
}: {
  request: Request;
  params: { sponsorId: string; fundId: string };
}) {
  const cookie = request.headers.get("cookie") || undefined;
  const [fund, sponsor] = await Promise.all([
    api.getFund(params.fundId, cookie),
    api.getSponsor(params.sponsorId, cookie),
  ]);
  return { fund, sponsor };
}

export async function action({
  request,
  params,
}: {
  request: Request;
  params: { sponsorId: string; fundId: string };
}) {
  const form = await request.formData();
  const intent = form.get("intent");
  const cookie = request.headers.get("cookie") || undefined;

  if (intent === "create-company") {
    const payload = JSON.parse(String(form.get("company") || "{}"));
    const result = await api.createCompany(params.fundId, payload, cookie);
    if (!result.ok) return { intent, ok: false, error: result.error };
    return { intent, ok: true };
  }

  if (intent === "delete-company") {
    const name = String(form.get("name") || "");
    if (!name) return { intent, ok: false, error: "Missing company name" };
    const result = await api.deleteCompany(params.fundId, name, cookie);
    if (!result.ok) return { intent, ok: false, error: result.error };
    return { intent, ok: true };
  }

  return { intent: "unknown", ok: false, error: "Unknown intent" };
}

const DOC_TYPES = ["All", "Capital Account Statement", "Quarterly Report", "Annual Report", "Financial Statement"];

function confidenceColor(c: number): string {
  if (c >= 90) return "text-atlas-green";
  if (c >= 75) return "text-atlas-orange";
  return "text-atlas-red";
}

type Tab = "companies" | "cashflows" | "nav" | "documents";

export default function FundDetail() {
  const { fund, sponsor } = useLoaderData<{
    fund: Fund;
    sponsor: Sponsor;
  }>();
  const companies = useMergedCompanies(fund.id, fund.companies);
  const { documents: allDocs } = useClientData();
  const { openDocObject } = useDocViewer();
  const cn = useCan();
  const [tab, setTab] = useState<Tab>("companies");
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [docTypeFilter, setDocTypeFilter] = useState("All");
  const t = useT();
  const fd = t.fundDetail;
  const da = t.docActions;
  const { toast } = useToast();

  function downloadDoc(d: Document) {
    if (!d.file_url) return toast(t.toast.downloadUnavailable, "warning");
    const a = document.createElement("a");
    a.href = d.file_url;
    a.download = d.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  // Theme donut data from companies
  const themeData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of companies) map[c.theme] = (map[c.theme] || 0) + c.fmv;
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [companies]);

  // Fund documents
  const fundDocs = useMemo(() => allDocs.filter((d) => d.fund_id === fund.id), [allDocs, fund.id]);
  const filteredDocs = useMemo(() => {
    if (docTypeFilter === "All") return fundDocs;
    return fundDocs.filter((d) => d.doc_type === docTypeFilter);
  }, [fundDocs, docTypeFilter]);
  const docTypeCounts = useMemo(() => {
    const counts: Record<string, number> = { All: fundDocs.length };
    for (const dt of DOC_TYPES.slice(1)) counts[dt] = fundDocs.filter((d) => d.doc_type === dt).length;
    return counts;
  }, [fundDocs]);

  // Cashflow summary
  const cfSummary = useMemo(() => {
    const totalCalls = fund.cashflows.reduce((s, c) => s + c.calls, 0);
    const totalDist = fund.cashflows.reduce((s, c) => s + c.dist, 0);
    return { totalCalls, totalDist, net: totalDist - totalCalls };
  }, [fund.cashflows]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "companies", label: fd.companiesTab(companies.length) },
    { key: "cashflows", label: fd.cashFlows },
    { key: "nav", label: fd.navHistory },
    { key: "documents", label: `${fd.documents} (${fundDocs.length})` },
  ];

  const companyHeaders = [fd.colCompany, fd.colTheme, fd.colInvested, fd.colFmv, fd.colMoic, fd.colIrr, fd.colStatus, fd.colOwn];
  const companyLeftAlign: string[] = [fd.colCompany, fd.colTheme, fd.colStatus];
  const txHeaders = [fd.colDate, fd.colType, fd.colAmount, fd.colRunningBalance, fd.colNote];
  const txLeftAlign: string[] = [fd.colDate, fd.colType, fd.colNote];

  return (
    <div className="flex-1 overflow-y-auto p-7 flex flex-col gap-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs">
        <Link to="/sponsors" className="text-atlas-gray3 hover:text-atlas-purple no-underline">
          {t.sidebar.sponsors}
        </Link>
        <span className="text-atlas-gray4">/</span>
        <Link
          to={`/sponsors/${sponsor.id}`}
          className="text-atlas-gray3 hover:text-atlas-purple no-underline"
        >
          {sponsor.name}
        </Link>
        <span className="text-atlas-gray4">/</span>
        <span className="text-atlas-white">{fund.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-4">
        <SponsorBadge initials={sponsor.initials} color={sponsor.color} size="lg" />
        <div>
          <h1 className="text-[22px] font-bold text-atlas-white font-display">{fund.name}</h1>
          <p className="text-[13px] text-atlas-gray3 mt-0.5">
            {fund.strategy} &middot; {fund.vintage} &middot; {fund.geography} &middot; {fund.currency}
          </p>
        </div>
        <span className="ml-auto text-[10px] px-3 py-1 rounded bg-atlas-purple-dim text-atlas-purple-light font-semibold">
          {fund.asset_class}
        </span>
      </div>

      {/* 10 KPI Metrics */}
      <div className="grid grid-cols-10 gap-2">
        {[
          { label: fd.grossIrr, value: formatIrr(fund.gross_irr), color: irrColor(fund.gross_irr), title: formatIrr(fund.gross_irr, 4) },
          { label: fd.netIrr, value: formatIrr(fund.net_irr), color: irrColor(fund.net_irr), title: formatIrr(fund.net_irr, 4) },
          { label: fd.grossMoic, value: formatMultiplier(fund.gross_moic), color: moicColor(fund.gross_moic) },
          { label: fd.netMoic, value: formatMultiplier(fund.net_moic), color: moicColor(fund.net_moic) },
          { label: fd.tvpi, value: formatMultiplier(fund.tvpi), color: "text-atlas-purple", title: undefined as string | undefined },
          { label: fd.dpi, value: formatMultiplier(fund.dpi), color: "text-atlas-gray1" },
          { label: fd.rvpi, value: formatMultiplier(fund.rvpi), color: "text-atlas-gray1" },
          { label: fd.nav, value: formatCurrency(fund.nav), color: "text-atlas-white" },
          { label: fd.paidIn, value: formatCurrency(fund.paid_in), color: "text-atlas-white" },
          { label: fd.unfunded, value: formatCurrency(fund.unfunded), color: "text-atlas-orange" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-atlas-card border border-atlas-border rounded-xl px-3 py-3">
            <div className="text-[9px] text-atlas-gray3 uppercase tracking-widest mb-1">
              {kpi.label}
            </div>
            <div className={`text-[16px] font-bold font-mono ${kpi.color}`} title={kpi.title}>
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={`px-3 py-[5px] rounded-full border text-xs font-semibold cursor-pointer transition-colors ${
              tab === tb.key
                ? "border-atlas-purple bg-atlas-purple-dim text-atlas-purple"
                : "border-atlas-border bg-transparent text-atlas-gray3 hover:border-atlas-gray4"
            }`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === "companies" && (
        <div className="flex flex-col gap-4">
          <div className="flex justify-end">
            {cn("company.add") && (
            <button
              onClick={() => setShowAddCompany(true)}
              className="px-3.5 py-[7px] rounded-lg border-none bg-atlas-purple text-atlas-white text-xs cursor-pointer font-semibold"
            >
              + {t.drawers.addCompany}
            </button>
            )}
          </div>
          <div className="grid grid-cols-[1fr_280px] gap-5">
          {/* Companies Table */}
          <div className="bg-atlas-card border border-atlas-border rounded-[14px]">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-atlas-surface">
                  {companyHeaders.map((h) => (
                    <th
                      key={h}
                      className={`py-[9px] px-3.5 text-[10px] font-semibold text-atlas-gray4 uppercase tracking-wider ${
                        companyLeftAlign.includes(h)
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
                {companies.map((c) => (
                  <tr
                    key={c.name}
                    className="border-t border-atlas-border hover:bg-atlas-card-hover transition-colors"
                  >
                    <td className="py-3 px-3.5 text-[12px] font-semibold text-atlas-white">
                      {c.name}
                    </td>
                    <td className="py-3 px-3.5 text-[11px] text-atlas-gray3">{c.theme}</td>
                    <td className="py-3 px-3.5 text-right text-[12px] text-atlas-white font-mono">
                      {formatCurrency(c.invested)}
                    </td>
                    <td className="py-3 px-3.5 text-right text-[12px] text-atlas-white font-mono">
                      {formatCurrency(c.fmv)}
                    </td>
                    <td className={`py-3 px-3.5 text-right text-[12px] font-bold font-mono ${moicColor(c.moic)}`}>
                      {formatMultiplier(c.moic)}
                    </td>
                    <td
                      className={`py-3 px-3.5 text-right text-[12px] font-bold font-mono ${irrColor(c.irr)}`}
                      title={formatIrr(c.irr, 4)}
                    >
                      {formatIrr(c.irr)}
                    </td>
                    <td className="py-3 px-3.5">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-atlas-green-dim text-atlas-green font-semibold">
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-right text-[11px] text-atlas-gray2 font-mono">
                      {c.own > 0 ? `${c.own.toFixed(1)}%` : "\u2014"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Theme Donut Sidebar */}
          <MiniDonut data={themeData} title={fd.byTheme} />
        </div>
        </div>
      )}

      {tab === "cashflows" && (
        <div className="flex flex-col gap-4">
          <div className="bg-atlas-card border border-atlas-border rounded-[14px] p-5">
            <div className="text-sm font-semibold text-atlas-white mb-4">{fd.capitalActivity}</div>
            <CashflowChart data={fund.cashflows} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-atlas-card border border-atlas-border rounded-xl px-5 py-4">
              <div className="text-[10px] text-atlas-gray3 uppercase tracking-widest mb-1">
                {fd.totalCalls}
              </div>
              <div className="text-[18px] font-bold text-atlas-purple font-mono">
                {formatCurrency(cfSummary.totalCalls)}
              </div>
            </div>
            <div className="bg-atlas-card border border-atlas-border rounded-xl px-5 py-4">
              <div className="text-[10px] text-atlas-gray3 uppercase tracking-widest mb-1">
                {fd.totalDistributions}
              </div>
              <div className="text-[18px] font-bold text-atlas-green font-mono">
                {formatCurrency(cfSummary.totalDist)}
              </div>
            </div>
            <div className="bg-atlas-card border border-atlas-border rounded-xl px-5 py-4">
              <div className="text-[10px] text-atlas-gray3 uppercase tracking-widest mb-1">
                {fd.netCashFlow}
              </div>
              <div
                className={`text-[18px] font-bold font-mono ${
                  cfSummary.net >= 0 ? "text-atlas-green" : "text-atlas-red"
                }`}
              >
                {cfSummary.net >= 0 ? "+" : ""}
                {formatCurrency(Math.abs(cfSummary.net))}
              </div>
            </div>
          </div>

          {/* Transaction Ledger */}
          {fund.transactions && fund.transactions.length > 0 && (
            <div className="bg-atlas-card border border-atlas-border rounded-[14px]">
              <div className="px-5 py-3.5 border-b border-atlas-border text-sm font-semibold text-atlas-white">
                {fd.transactionLedger}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-atlas-surface">
                      {txHeaders.map((h) => (
                        <th
                          key={h}
                          className={`py-[9px] px-3.5 text-[10px] font-semibold text-atlas-gray4 uppercase tracking-wider whitespace-nowrap ${
                            txLeftAlign.includes(h) ? "text-left" : "text-right"
                          }`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const sorted = [...fund.transactions].sort(
                        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
                      );
                      let balance = 0;
                      return sorted.map((tx, i) => {
                        balance += tx.amount;
                        const isCall = tx.tx_type === "Capital Call";
                        return (
                          <tr
                            key={i}
                            className="border-t border-atlas-border hover:bg-atlas-card-hover transition-colors"
                          >
                            <td className="py-3 px-3.5 text-[11px] font-mono text-atlas-gray2 whitespace-nowrap">
                              {tx.date}
                            </td>
                            <td className="py-3 px-3.5">
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                                  isCall
                                    ? "bg-atlas-red-dim text-atlas-red"
                                    : "bg-atlas-green-dim text-atlas-green"
                                }`}
                              >
                                {tx.tx_type}
                              </span>
                            </td>
                            <td
                              className={`py-3 px-3.5 text-right text-[12px] font-bold font-mono ${
                                isCall ? "text-atlas-red" : "text-atlas-green"
                              }`}
                            >
                              {isCall
                                ? `(${formatCurrency(Math.abs(tx.amount))})`
                                : `+${formatCurrency(tx.amount)}`}
                            </td>
                            <td
                              className={`py-3 px-3.5 text-right text-[12px] font-mono font-semibold ${
                                balance < 0 ? "text-atlas-red" : "text-atlas-green"
                              }`}
                            >
                              {balance < 0
                                ? `(${formatCurrency(Math.abs(balance))})`
                                : formatCurrency(balance)}
                            </td>
                            <td className="py-3 px-3.5 text-[11px] text-atlas-gray3">
                              {tx.note}
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "nav" && (
        <div className="flex flex-col gap-5">
          <div className="bg-atlas-card border border-atlas-border rounded-[14px] p-5">
            <div className="text-sm font-semibold text-atlas-white mb-4">{fd.navHistoryTitle}</div>
            <NavHistoryChart data={fund.nav_history} />
          </div>

          {/* Equity Deployment (J-curve) */}
          <div className="bg-atlas-card border border-atlas-border rounded-[14px] p-5">
            <div className="flex items-center justify-between mb-1">
              <div className="text-sm font-semibold text-atlas-white">{t.directs.jCurve}</div>
              <div className="flex items-center gap-3 text-[10px] text-atlas-gray3">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--color-atlas-red)" }} />Deployment</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--color-atlas-green)" }} />NAV</span>
              </div>
            </div>
            <div className="text-[10px] text-atlas-gray4 mb-2">{t.directs.deploymentLegend}</div>
            <EquityDeploymentChart data={buildFundJCurve(fund)} />
          </div>

          {/* Subjective performance indicator */}
          <PerformanceIndicator
            riskRating={fund.risk_rating ?? "yellow"}
            netIrr={fund.net_irr}
            pctCalled={fund.pct_called}
            valuations={fund.nav_history.map((p) => p.nav)}
            reportReceived={fund.report_received}
          />
        </div>
      )}

      {tab === "documents" && (
        <div className="flex flex-col gap-4">
          {/* Type filter pills */}
          <div className="flex gap-2">
            {DOC_TYPES.map((dt) => (
              <button
                key={dt}
                onClick={() => setDocTypeFilter(dt)}
                className={`px-3 py-[5px] rounded-full border text-xs font-semibold cursor-pointer transition-colors flex gap-1.5 items-center ${
                  docTypeFilter === dt
                    ? "border-atlas-purple bg-atlas-purple-dim text-atlas-purple"
                    : "border-atlas-border bg-transparent text-atlas-gray3 hover:border-atlas-gray4"
                }`}
              >
                {dt === "All" ? da.allTypes : dt}
                <span className="bg-atlas-border rounded-[10px] px-1.5 text-[10px] text-atlas-gray3">
                  {docTypeCounts[dt] || 0}
                </span>
              </button>
            ))}
          </div>

          <div className="bg-atlas-card border border-atlas-border rounded-[14px]">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-atlas-surface">
                  {[t.vault.colDocument, t.vault.colType, t.vault.colConfidence, t.vault.colDate, t.vault.colSize, t.vault.colStatus, ""].map((h) => (
                    <th key={h} className="py-[9px] px-3.5 text-left text-[10.5px] font-semibold text-atlas-gray4 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredDocs.map((d) => (
                  <tr
                    key={d.id}
                    onClick={() => openDocObject(d)}
                    className="border-t border-atlas-border hover:bg-atlas-card-hover transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-9 bg-atlas-border rounded flex items-center justify-center text-[9px] text-atlas-gray3 font-bold shrink-0">{(d.file_url || "").toLowerCase().endsWith(".xlsx") ? "XLS" : "PDF"}</div>
                        <div>
                          <div className="text-[12.5px] font-semibold text-atlas-white">{d.name}</div>
                          <div className="text-[10px] text-atlas-gray4">{d.size}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3.5 text-[11.5px] text-atlas-gray2">{d.doc_type}</td>
                    <td className="py-3 px-3.5">
                      {d.confidence ? (
                        <span className={`text-xs font-bold font-mono ${confidenceColor(d.confidence)}`}>{d.confidence}%</span>
                      ) : (
                        <span className="text-atlas-gray4 text-xs">&mdash;</span>
                      )}
                    </td>
                    <td className="py-3 px-3.5 text-[11.5px] text-atlas-gray3 font-mono">{d.date}</td>
                    <td className="py-3 px-3.5 text-[11.5px] text-atlas-gray3">{d.size}</td>
                    <td className="py-3 px-3.5"><StatusBadge status={d.status} /></td>
                    <td className="py-3 px-3.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <button onClick={() => openDocObject(d)} className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-atlas-purple-dim text-atlas-gray3 hover:text-atlas-purple transition-colors cursor-pointer text-xs" title={da.view}>&#x2922;</button>
                        <button onClick={() => downloadDoc(d)} className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-atlas-purple-dim text-atlas-gray3 hover:text-atlas-purple transition-colors cursor-pointer text-xs" title={da.download}>&#x2193;</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredDocs.length === 0 && (
                  <tr><td colSpan={7} className="py-6 text-center text-[12px] text-atlas-gray4">{da.noDocuments}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AddCompanyDrawer open={showAddCompany} onClose={() => setShowAddCompany(false)} fundId={fund.id} />
    </div>
  );
}
