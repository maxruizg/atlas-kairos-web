import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { DarkTip } from "./DarkTip";

const COLORS = ["#8B7BD8", "#4DA8FF", "#00E5A0", "#FFB347", "#FF5C5C", "#00D4FF", "#B4A8EC"];

interface ExposureItem {
  name: string;
  value: number;
}

type Dimension = "Theme" | "Geography" | "Asset Class" | "Strategy";

export function ExposureChart({
  dataByDimension,
}: {
  dataByDimension: Record<Dimension, ExposureItem[]>;
}) {
  const [dim, setDim] = useState<Dimension>("Theme");
  const data = dataByDimension[dim] || [];

  return (
    <div className="bg-atlas-card border border-atlas-border rounded-[14px] p-5">
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm font-semibold text-atlas-white">Exposure Analysis</div>
        <div className="flex gap-1.5">
          {(Object.keys(dataByDimension) as Dimension[]).map((d) => (
            <button
              key={d}
              onClick={() => setDim(d)}
              className={`px-2.5 py-[3px] rounded-md border text-[11px] cursor-pointer transition-colors ${
                dim === d
                  ? "border-atlas-purple bg-atlas-purple-dim text-atlas-purple"
                  : "border-atlas-border bg-transparent text-atlas-gray3 hover:border-atlas-gray4"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={Math.max(data.length * 36, 120)}>
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 20 }}>
          <XAxis type="number" hide />
          <YAxis
            dataKey="name"
            type="category"
            width={120}
            tick={{ fill: "#8080A0", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<DarkTip />} cursor={{ fill: "rgba(139,123,216,0.06)" }} />
          <Bar dataKey="value" name="NAV" radius={[0, 4, 4, 0]} barSize={18}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
