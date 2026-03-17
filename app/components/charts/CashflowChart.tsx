import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { DarkTip } from "./DarkTip";
import { useChartColors } from "~/lib/chart-colors";
import type { CashflowPoint } from "~/lib/types";

export function CashflowChart({ data }: { data: CashflowPoint[] }) {
  const cc = useChartColors();
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ left: 0, right: 10, top: 10 }}>
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
          tickFormatter={(v) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : `${(v / 1e3).toFixed(0)}K`)}
        />
        <Tooltip content={<DarkTip />} cursor={{ fill: cc.cursorFill }} />
        <Legend
          iconSize={8}
          wrapperStyle={{ fontSize: 11, color: cc.legend }}
        />
        <Bar dataKey="calls" name="Capital Calls" fill={cc.purple} radius={[3, 3, 0, 0]} barSize={14} />
        <Bar dataKey="dist" name="Distributions" fill={cc.green} radius={[3, 3, 0, 0]} barSize={14} />
      </BarChart>
    </ResponsiveContainer>
  );
}
