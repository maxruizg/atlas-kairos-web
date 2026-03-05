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
import type { CashflowPoint } from "~/lib/types";

export function CashflowChart({ data }: { data: CashflowPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ left: 0, right: 10, top: 10 }}>
        <XAxis
          dataKey="q"
          tick={{ fill: "#505068", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "#505068", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : `${(v / 1e3).toFixed(0)}K`)}
        />
        <Tooltip content={<DarkTip />} cursor={{ fill: "rgba(139,123,216,0.06)" }} />
        <Legend
          iconSize={8}
          wrapperStyle={{ fontSize: 11, color: "#8080A0" }}
        />
        <Bar dataKey="calls" name="Capital Calls" fill="#8B7BD8" radius={[3, 3, 0, 0]} barSize={14} />
        <Bar dataKey="dist" name="Distributions" fill="#00E5A0" radius={[3, 3, 0, 0]} barSize={14} />
      </BarChart>
    </ResponsiveContainer>
  );
}
