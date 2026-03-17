import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { DarkTip } from "./DarkTip";
import { useChartColors } from "~/lib/chart-colors";

interface DonutDatum {
  name: string;
  value: number;
}

export function MiniDonut({
  data,
  title,
  colors,
}: {
  data: DonutDatum[];
  title: string;
  colors?: string[];
}) {
  const cc = useChartColors();
  const palette = colors || cc.palette;
  return (
    <div className="bg-atlas-card border border-atlas-border rounded-[14px] px-4 py-4 flex flex-col items-center">
      <div className="text-[11px] text-atlas-gray3 uppercase tracking-widest mb-2">{title}</div>
      <ResponsiveContainer width="100%" height={140}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={35}
            outerRadius={55}
            paddingAngle={2}
            dataKey="value"
            stroke="none"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={palette[i % palette.length]} />
            ))}
          </Pie>
          <Tooltip content={<DarkTip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-1">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center gap-1 text-[10px] text-atlas-gray2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: palette[i % palette.length] }}
            />
            {d.name}
          </div>
        ))}
      </div>
    </div>
  );
}
