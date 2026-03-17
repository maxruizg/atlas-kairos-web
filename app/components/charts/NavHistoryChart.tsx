import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { DarkTip } from "./DarkTip";
import { useChartColors } from "~/lib/chart-colors";
import type { NavPoint } from "~/lib/types";

export function NavHistoryChart({ data }: { data: NavPoint[] }) {
  const cc = useChartColors();
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ left: 0, right: 10, top: 10 }}>
        <defs>
          <linearGradient id="navGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={cc.gradientStart} stopOpacity={0.4} />
            <stop offset="100%" stopColor={cc.gradientStart} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="q"
          tick={{ fill: cc.tick, fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: cc.tick, fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `$${(v / 1e6).toFixed(1)}M`}
        />
        <Tooltip content={<DarkTip />} />
        <Area
          type="monotone"
          dataKey="nav"
          name="NAV"
          stroke={cc.purple}
          strokeWidth={2}
          fill="url(#navGrad)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
