import type { Fund } from "~/lib/types";
import { formatCurrency, formatMultiplier, formatIrr } from "~/lib/utils";
import { useT } from "~/lib/use-t";

type MetricType = "grossIrr" | "netIrr" | "tvpi" | "dpi" | "rvpi" | "nav" | "paidIn" | "commitment" | "distributions" | "pctCalled" | "grossMoic" | "netMoic";

interface Props {
  fund: Fund;
  metric: MetricType;
  portfolioAvgIrr?: number;
  portfolioAvgTvpi?: number;
  onClose: () => void;
}

export function MetricDetailPanel({ fund, metric, portfolioAvgIrr = 0, portfolioAvgTvpi = 0, onClose }: Props) {
  const t = useT();
  const md = t.metricDetail;

  return (
    <div className="bg-atlas-surface border-l-[3px] border-l-atlas-purple p-4 relative">
      <button
        onClick={onClose}
        className="absolute top-3 right-3 w-6 h-6 rounded-md flex items-center justify-center text-atlas-gray3 hover:text-atlas-white hover:bg-atlas-card transition-colors cursor-pointer text-sm"
      >
        &times;
      </button>

      {(metric === "grossIrr" || metric === "netIrr") && (
        <div className="flex flex-col gap-3">
          <div className="text-[11px] text-atlas-gray3">{md.xirrNote}</div>
          {/* Cash flow timeline */}
          <div className="flex items-center gap-1 h-10">
            <div className="flex-1 relative h-full">
              <div className="absolute top-1/2 left-0 right-0 h-px bg-atlas-border" />
              {fund.transactions.slice(0, 12).map((tx, i) => {
                const isCall = tx.tx_type === "Capital Call";
                return (
                  <div
                    key={i}
                    className="absolute flex flex-col items-center"
                    style={{ left: `${(i / Math.max(fund.transactions.length - 1, 1)) * 100}%`, top: isCall ? "55%" : "0" }}
                  >
                    <div className={`w-2 h-2 rounded-full ${isCall ? "bg-atlas-red" : "bg-atlas-green"}`} />
                    <span className="text-[7px] text-atlas-gray4 mt-0.5 whitespace-nowrap">{tx.date.slice(0, 7)}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex gap-2">
            <span className="text-[10px] px-2 py-0.5 rounded bg-atlas-purple-dim text-atlas-purple font-semibold font-mono">
              {md.grossNetSpread}: {Math.abs(fund.gross_irr - fund.net_irr).toFixed(1)}%
            </span>
            <span className="text-[10px] text-atlas-gray3">
              {md.portfolioAvg}: {formatIrr(portfolioAvgIrr)}
            </span>
          </div>
        </div>
      )}

      {(metric === "tvpi" || metric === "grossMoic" || metric === "netMoic") && (
        <div className="flex flex-col gap-3">
          <div className="text-[11px] text-atlas-gray2 font-mono">
            {md.formula}: ({formatCurrency(fund.distributions)} + {formatCurrency(fund.nav)}) / {formatCurrency(fund.paid_in)} = {formatMultiplier(fund.tvpi)}
          </div>
          {/* DPI + RVPI stacked bar */}
          <div className="flex flex-col gap-1">
            <div className="flex h-5 rounded-md overflow-hidden">
              {fund.tvpi > 0 && (
                <>
                  <div className="bg-atlas-green h-full flex items-center justify-center text-[8px] font-bold text-white" style={{ width: `${(fund.dpi / fund.tvpi) * 100}%` }}>
                    DPI {formatMultiplier(fund.dpi)}
                  </div>
                  <div className="bg-atlas-blue h-full flex items-center justify-center text-[8px] font-bold text-white" style={{ width: `${(fund.rvpi / fund.tvpi) * 100}%` }}>
                    RVPI {formatMultiplier(fund.rvpi)}
                  </div>
                </>
              )}
            </div>
          </div>
          <span className="text-[10px] text-atlas-gray3">{md.portfolioAvg} TVPI: {formatMultiplier(portfolioAvgTvpi)}</span>
        </div>
      )}

      {(metric === "dpi" || metric === "rvpi") && (
        <div className="flex flex-col gap-3">
          <div className="text-[11px] text-atlas-gray2">
            {md.realizedUnrealized}: {formatCurrency(fund.distributions)} | {formatCurrency(fund.nav)}
          </div>
          {/* Progress bar */}
          <div className="flex flex-col gap-1">
            <div className="w-full h-4 bg-atlas-border rounded-md overflow-hidden flex">
              {fund.tvpi > 0 && (
                <>
                  <div className="bg-atlas-green h-full" style={{ width: `${(fund.dpi / fund.tvpi) * 100}%` }} />
                  <div className="bg-atlas-blue h-full" style={{ width: `${(fund.rvpi / fund.tvpi) * 100}%` }} />
                </>
              )}
            </div>
            <div className="flex justify-between text-[9px] text-atlas-gray3">
              <span>DPI: {formatMultiplier(fund.dpi)}</span>
              <span>RVPI: {formatMultiplier(fund.rvpi)}</span>
            </div>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-atlas-purple-dim text-atlas-purple font-semibold inline-block w-fit">
            {md.realizationStage}: {fund.dpi < 0.3 ? md.early : fund.dpi < 0.7 ? md.mid : md.late}
          </span>
        </div>
      )}

      {metric === "nav" && (
        <div className="flex flex-col gap-2">
          <div className="text-[11px] text-atlas-gray3">{md.navHistory}</div>
          {/* Mini sparkline */}
          <div className="h-[80px] flex items-end gap-1">
            {fund.nav_history.slice(-4).map((nh, i) => {
              const max = Math.max(...fund.nav_history.slice(-4).map((n) => n.nav), 1);
              const pct = (nh.nav / max) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                  <div className="w-full bg-atlas-purple rounded-sm" style={{ height: `${pct}%` }} />
                  <span className="text-[7px] text-atlas-gray4 font-mono">{nh.q}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {(metric === "paidIn" || metric === "commitment") && (
        <div className="flex flex-col gap-3">
          <div className="text-[11px] text-atlas-gray3">{md.pctCalledProgress}</div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-4 bg-atlas-border rounded-md overflow-hidden">
              <div className="h-full bg-atlas-purple rounded-md" style={{ width: `${fund.pct_called}%` }} />
            </div>
            <span className="text-[12px] font-bold font-mono text-atlas-white">{fund.pct_called.toFixed(0)}%</span>
          </div>
          <div className="text-[11px] text-atlas-gray2">
            {md.unfundedRemaining}: {formatCurrency(fund.unfunded)}
          </div>
          <div className="text-[10px] text-atlas-gray4">{fund.currency}</div>
        </div>
      )}

      {metric === "distributions" && (
        <div className="flex flex-col gap-3">
          <div className="text-[11px] text-atlas-gray2">
            {md.realizedUnrealized}: {formatCurrency(fund.distributions)} | {formatCurrency(fund.nav)}
          </div>
          <div className="text-[11px] text-atlas-gray2 font-mono">
            DPI: {formatMultiplier(fund.dpi)} &middot; RVPI: {formatMultiplier(fund.rvpi)}
          </div>
        </div>
      )}
    </div>
  );
}
