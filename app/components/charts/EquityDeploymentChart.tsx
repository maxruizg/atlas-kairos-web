import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import { DarkTip } from "./DarkTip";
import { useChartColors } from "~/lib/chart-colors";
import type { Fund, DirectInvestment } from "~/lib/types";

export interface JCurvePoint {
  year: string;
  deployment: number; // negative — cumulative capital deployed
  nav: number; // ascending — historic NAV
}

function yearOf(q: string): string {
  const m = q.match(/(\d{4})/);
  return m ? m[1] : q;
}

/** Build the classic J-curve series for a fund from its capital log /
 *  cashflows (cumulative calls, shown negative) and NAV history. */
export function buildFundJCurve(fund: Fund): JCurvePoint[] {
  const callsByYear = new Map<string, number>();
  const log = fund.capital_log?.length
    ? fund.capital_log.filter((c) => c.type === "call").map((c) => ({ y: yearOf(c.date), amt: c.amount }))
    : fund.cashflows.map((c) => ({ y: yearOf(c.q), amt: c.calls }));
  for (const { y, amt } of log) callsByYear.set(y, (callsByYear.get(y) || 0) + amt);

  const navByYear = new Map<string, number>();
  for (const p of fund.nav_history) navByYear.set(yearOf(p.q), p.nav);

  const years = Array.from(new Set([...callsByYear.keys(), ...navByYear.keys()])).sort();
  let cumCalls = 0;
  let lastNav = 0;
  return years.map((y) => {
    cumCalls += callsByYear.get(y) || 0;
    if (navByYear.has(y)) lastNav = navByYear.get(y)!;
    return { year: y, deployment: -cumCalls, nav: lastNav };
  });
}

/** Build the J-curve for a direct: cost deployed once at entry (negative),
 *  NAV from the dated valuation history. */
export function buildDirectJCurve(d: DirectInvestment): JCurvePoint[] {
  const entryYear = yearOf(d.investment_date);
  const navByYear = new Map<string, number>();
  for (const v of d.valuation_history) navByYear.set(yearOf(v.date), v.value);

  const years = Array.from(new Set([entryYear, ...navByYear.keys()])).sort();
  let lastNav = 0;
  return years.map((y) => {
    if (navByYear.has(y)) lastNav = navByYear.get(y)!;
    const deployed = y >= entryYear ? -d.cost : 0;
    return { year: y, deployment: deployed, nav: lastNav };
  });
}

function fmtMM(v: number) {
  const abs = Math.abs(v);
  const s = abs >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : `$${(v / 1e3).toFixed(0)}K`;
  return s;
}

export function EquityDeploymentChart({ data }: { data: JCurvePoint[] }) {
  const cc = useChartColors();
  if (!data.length) {
    return (
      <div className="h-[280px] flex items-center justify-center text-[12px] text-atlas-gray4">
        No deployment data yet.
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ left: 4, right: 24, top: 24, bottom: 4 }}>
        <XAxis
          dataKey="year"
          tick={{ fill: cc.tick, fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: cc.tick, fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => fmtMM(v)}
          width={56}
        />
        <ReferenceLine y={0} stroke={cc.tick} strokeOpacity={0.4} />
        <Tooltip content={<DarkTip />} cursor={{ stroke: cc.tick, strokeOpacity: 0.2 }} />
        <Line
          type="monotone"
          dataKey="deployment"
          name="Equity Deployment"
          stroke={cc.red}
          strokeWidth={2.5}
          dot={{ r: 3.5, fill: cc.red, strokeWidth: 0 }}
          activeDot={{ r: 5 }}
          isAnimationActive
          animationDuration={900}
        >
          <LabelList
            dataKey="deployment"
            position="bottom"
            formatter={(v: any) => fmtMM(Number(v))}
            style={{ fill: cc.tickLight, fontSize: 9, fontFamily: "IBM Plex Mono" }}
          />
        </Line>
        <Line
          type="monotone"
          dataKey="nav"
          name="Historic NAV"
          stroke={cc.green}
          strokeWidth={2.5}
          dot={{ r: 3.5, fill: cc.green, strokeWidth: 0 }}
          activeDot={{ r: 5 }}
          isAnimationActive
          animationDuration={900}
        >
          <LabelList
            dataKey="nav"
            position="top"
            formatter={(v: any) => fmtMM(Number(v))}
            style={{ fill: cc.tickLight, fontSize: 9, fontFamily: "IBM Plex Mono" }}
          />
        </Line>
      </LineChart>
    </ResponsiveContainer>
  );
}
