import type { Kpi } from "~/lib/types";

const colorMap: Record<string, string> = {
  white: "text-atlas-white",
  orange: "text-atlas-orange",
  purple: "text-atlas-purple",
};

export function KPICard({ kpi, sub }: { kpi: Kpi; sub?: string }) {
  return (
    <div className="bg-atlas-card border border-atlas-border rounded-xl px-[18px] py-4">
      <div className="text-[11px] text-atlas-gray3 uppercase tracking-widest mb-1.5">
        {kpi.label}
      </div>
      <div
        className={`text-[22px] font-bold font-mono ${colorMap[kpi.color] || "text-atlas-white"}`}
      >
        {kpi.value}
      </div>
      {sub && (
        <div className="text-[10px] text-atlas-gray3 mt-0.5 font-mono">{sub}</div>
      )}
    </div>
  );
}
