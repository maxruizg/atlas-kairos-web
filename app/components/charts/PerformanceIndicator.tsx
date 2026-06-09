import type { RiskRating } from "~/lib/types";
import { RiskDot } from "~/components/drawers/form-fields";

export interface PerfInputs {
  riskRating: RiskRating;
  netIrr: number;
  irrTarget?: number; // default 12%
  pctCalled?: number | null;
  valuations?: number[]; // chronological, last few
  reportReceived?: boolean | null;
}

interface PerfResult {
  score: number; // 1..5
  tag: string;
  trend: "up" | "flat" | "down" | "n/a";
  narrative: string;
}

const TAGS: Record<number, string> = {
  1: "Underperforming",
  2: "Watch",
  3: "On Track",
  4: "On Track",
  5: "Outperforming",
};

/** Derive a 1–5 health score from IRR vs target, called pace, valuation
 *  trend and report timeliness — the subjective performance read. */
export function computePerformance(p: PerfInputs): PerfResult {
  const target = p.irrTarget ?? 12;
  let score = 3;

  // IRR vs target
  if (p.netIrr >= target + 5) score += 1.5;
  else if (p.netIrr >= target) score += 0.5;
  else if (p.netIrr >= 0) score -= 0.5;
  else score -= 1.5;

  // Valuation trend (last 3 observations)
  let trend: PerfResult["trend"] = "n/a";
  const v = p.valuations ?? [];
  if (v.length >= 2) {
    const recent = v.slice(-3);
    const first = recent[0];
    const last = recent[recent.length - 1];
    const chg = first > 0 ? (last - first) / first : 0;
    if (chg > 0.05) { trend = "up"; score += 0.75; }
    else if (chg < -0.05) { trend = "down"; score -= 0.75; }
    else trend = "flat";
  }

  // Report timeliness
  if (p.reportReceived === false) score -= 0.25;

  score = Math.max(1, Math.min(5, Math.round(score)));

  const trendWord = trend === "up" ? "rising" : trend === "down" ? "declining" : trend === "flat" ? "flat" : "limited history";
  const paceFrag =
    p.pctCalled != null ? `, ${p.pctCalled.toFixed(0)}% called` : "";
  const irrFrag = `Net IRR ${p.netIrr > 0 ? "+" : ""}${p.netIrr.toFixed(1)}%`;
  const vsTarget = p.netIrr >= target ? "at or above target" : "below target";
  const narrative = `${irrFrag}${paceFrag}, valuation ${trendWord} — performance ${vsTarget}${
    score <= 2 ? ", monitoring closely" : score >= 4 ? ", tracking ahead of plan" : " and within normal vintage range"
  }.`;

  return { score, tag: TAGS[score], trend, narrative };
}

const STATUS_LINE: Record<RiskRating, string> = {
  green: "On track — no concerns flagged",
  yellow: "Watch — monitoring developments",
  red: "Concern — active attention required",
};

export function PerformanceIndicator(props: PerfInputs) {
  const r = computePerformance(props);
  const trendGlyph = r.trend === "up" ? "▲" : r.trend === "down" ? "▼" : r.trend === "flat" ? "▬" : "—";
  const trendColor =
    r.trend === "up" ? "text-atlas-green" : r.trend === "down" ? "text-atlas-red" : "text-atlas-gray3";

  return (
    <div className="bg-atlas-card border border-atlas-border rounded-[14px] p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-bold text-atlas-white font-display">Performance Indicator</span>
        <div className="flex items-center gap-2">
          <RiskDot value={props.riskRating} size={12} />
          <span className="text-[11px] text-atlas-gray2">{STATUS_LINE[props.riskRating]}</span>
        </div>
      </div>

      {/* 1–5 gauge */}
      <div className="flex items-center gap-3">
        <div className="flex gap-1.5 flex-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex-1 h-2 rounded-full"
              style={{
                background:
                  i <= r.score
                    ? r.score <= 2
                      ? "var(--color-atlas-red)"
                      : r.score === 3
                        ? "var(--color-atlas-orange)"
                        : "var(--color-atlas-green)"
                    : "var(--color-atlas-border)",
              }}
            />
          ))}
        </div>
        <span className="text-[12px] font-bold text-atlas-white font-mono">{r.score}/5</span>
        <span className="text-[11px] font-semibold text-atlas-gray2">{r.tag}</span>
        <span className={`text-[11px] font-bold ${trendColor}`} title="Valuation trend">{trendGlyph}</span>
      </div>

      <p className="text-[11.5px] text-atlas-gray2 leading-relaxed">{r.narrative}</p>
    </div>
  );
}
