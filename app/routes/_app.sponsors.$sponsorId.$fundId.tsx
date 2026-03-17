import { useState, useMemo } from "react";
import { useLoaderData, Link } from "react-router";
import { api } from "~/lib/api.server";
import type { Fund, Sponsor } from "~/lib/types";
import { formatCurrency, formatMultiplier, formatIrr, irrColor, moicColor } from "~/lib/utils";
import { SponsorBadge } from "~/components/ui/SponsorBadge";
import { MiniDonut } from "~/components/charts/MiniDonut";
import { CashflowChart } from "~/components/charts/CashflowChart";
import { NavHistoryChart } from "~/components/charts/NavHistoryChart";
import { useT } from "~/lib/use-t";

export async function loader({ params }: { params: { sponsorId: string; fundId: string } }) {
  const [fund, sponsor] = await Promise.all([
    api.getFund(params.fundId),
    api.getSponsor(params.sponsorId),
  ]);
  return { fund, sponsor };
}

type Tab = "companies" | "cashflows" | "nav" | "documents";

export default function FundDetail() {
  const { fund, sponsor } = useLoaderData<{
    fund: Fund;
    sponsor: Sponsor;
  }>();
  const [tab, setTab] = useState<Tab>("companies");
  const t = useT();
  const fd = t.fundDetail;

  // Theme donut data from companies
  const themeData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of fund.companies) map[c.theme] = (map[c.theme] || 0) + c.fmv;
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [fund.companies]);

  // Cashflow summary
  const cfSummary = useMemo(() => {
    const totalCalls = fund.cashflows.reduce((s, c) => s + c.calls, 0);
    const totalDist = fund.cashflows.reduce((s, c) => s + c.dist, 0);
    return { totalCalls, totalDist, net: totalDist - totalCalls };
  }, [fund.cashflows]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "companies", label: fd.companiesTab(fund.companies.length) },
    { key: "cashflows", label: fd.cashFlows },
    { key: "nav", label: fd.navHistory },
    { key: "documents", label: fd.documents },
  ];

  const companyHeaders = [fd.colCompany, fd.colTheme, fd.colInvested, fd.colFmv, fd.colMoic, fd.colIrr, fd.colStatus, fd.colOwn];
  const companyLeftAlign = [fd.colCompany, fd.colTheme, fd.colStatus];
  const txHeaders = [fd.colDate, fd.colType, fd.colAmount, fd.colRunningBalance, fd.colNote];
  const txLeftAlign = [fd.colDate, fd.colType, fd.colNote];

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
                {fund.companies.map((c) => (
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
        <div className="bg-atlas-card border border-atlas-border rounded-[14px] p-5">
          <div className="text-sm font-semibold text-atlas-white mb-4">{fd.navHistoryTitle}</div>
          <NavHistoryChart data={fund.nav_history} />
        </div>
      )}

      {tab === "documents" && (
        <div className="bg-atlas-card border border-atlas-border rounded-[14px] p-5">
          <div className="text-sm font-semibold text-atlas-white mb-4">{fd.fundDocuments}</div>
          <div className="text-[13px] text-atlas-gray3">
            {fd.documentsComingSoon}
          </div>
        </div>
      )}
    </div>
  );
}
