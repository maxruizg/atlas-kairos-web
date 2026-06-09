import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { DarkTip } from "./DarkTip";
import { useChartColors } from "~/lib/chart-colors";
import { useLang } from "~/lib/lang-context";
import type { Fund } from "~/lib/types";

/** Vintage-year capital deployed + cumulative called-vs-committed pace. */
export function VintageCharts({ funds }: { funds: Fund[] }) {
  const cc = useChartColors();
  const { lang } = useLang();
  const L = (en: string, es: string) => (lang === "es" ? es : en);

  // Capital deployed (paid-in) grouped by vintage year.
  const byVintage = new Map<number, number>();
  for (const f of funds) byVintage.set(f.vintage, (byVintage.get(f.vintage) || 0) + f.paid_in);
  const vintageData = Array.from(byVintage.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([year, paid]) => ({ year: String(year), paid }));

  // Cumulative called vs committed across vintages (deployment pace).
  let cumCalled = 0;
  let cumCommit = 0;
  const paceData = vintageData.map((v) => {
    const yearFunds = funds.filter((f) => String(f.vintage) === v.year);
    cumCalled += yearFunds.reduce((s, f) => s + f.paid_in, 0);
    cumCommit += yearFunds.reduce((s, f) => s + f.commitment, 0);
    return { year: v.year, called: cumCalled, committed: cumCommit };
  });

  const fmt = (v: number) => `$${(v / 1e6).toFixed(0)}M`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="bg-atlas-card border border-atlas-border rounded-[14px] p-5">
        <div className="text-sm font-semibold text-atlas-white mb-4">
          {L("Capital Deployed by Vintage", "Capital Desplegado por Cosecha")}
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={vintageData} margin={{ left: 0, right: 8, top: 8 }}>
            <defs>
              <linearGradient id="vintGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={cc.gradientStart} stopOpacity={0.95} />
                <stop offset="100%" stopColor={cc.gradientStart} stopOpacity={0.35} />
              </linearGradient>
            </defs>
            <XAxis dataKey="year" tick={{ fill: cc.tick, fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: cc.tick, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={fmt} width={48} />
            <Tooltip content={<DarkTip />} cursor={{ fill: cc.cursorFill }} />
            <Bar dataKey="paid" name="Paid-In" radius={[6, 6, 0, 0]} fill="url(#vintGrad)" isAnimationActive animationDuration={800}>
              {vintageData.map((_, i) => <Cell key={i} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-atlas-card border border-atlas-border rounded-[14px] p-5">
        <div className="text-sm font-semibold text-atlas-white mb-4">
          {L("Capital Deployment Pace", "Ritmo de Despliegue de Capital")}
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={paceData} margin={{ left: 0, right: 8, top: 8 }}>
            <XAxis dataKey="year" tick={{ fill: cc.tick, fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: cc.tick, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={fmt} width={48} />
            <Tooltip content={<DarkTip />} />
            <Line type="monotone" dataKey="committed" name="Committed" stroke={cc.tickLight} strokeWidth={2} dot={false} strokeDasharray="4 3" isAnimationActive animationDuration={800} />
            <Line type="monotone" dataKey="called" name="Called" stroke={cc.purple} strokeWidth={2.5} dot={{ r: 3, fill: cc.purple }} isAnimationActive animationDuration={800} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
