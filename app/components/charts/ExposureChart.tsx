import { useState, useRef, useEffect, useMemo } from "react";
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
import { useChartColors } from "~/lib/chart-colors";
import { useT } from "~/lib/use-t";
import type { Fund } from "~/lib/types";

const VC_STAGES = ["Pre-Seed", "Seed", "Series A", "Growth"];
const PE_STRATEGIES = ["Buyout", "Growth", "Credit", "Special Situations", "Secondaries", "Carve-Out", "Public to Private"];
const RA_STRATEGIES = ["Value Add", "Core", "Development", "Opportunistic", "Mixed"];
const DIRECT_STRATEGIES = ["Real Estate", "Infrastructure", "Private Equity", "Venture Capital"];

// Asset classes that use stage-based grouping instead of theme
const STAGE_CLASSES: Record<string, string[]> = {
  "Venture Capital": VC_STAGES,
  "Private Equity": PE_STRATEGIES,
  "Real Assets": RA_STRATEGIES,
  Direct: DIRECT_STRATEGIES,
};

export function ExposureChart({ funds }: { funds: Fund[] }) {
  const [dim, setDim] = useState("All");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const cc = useChartColors();
  const t = useT();
  const te = t.exposure;

  const MENU_OPTIONS = useMemo(
    () => [
      { value: "All", label: te.allThemes, section: te.themeView },
      ...Object.entries(STAGE_CLASSES).map(([ac, stages]) => ({
        value: ac,
        label: ac,
        section: te.subThemes,
        subtitle: stages.join(", "),
      })),
    ],
    [te]
  );

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const data = useMemo(() => {
    const map: Record<string, number> = {};
    const stageList = STAGE_CLASSES[dim];

    if (stageList) {
      // Stage-based grouping (VC or PE)
      for (const f of funds) {
        for (const c of f.companies) {
          if (!c.stage) continue;
          // For VC: bucket anything beyond Series A into "Growth"
          const bucket =
            dim === "Venture Capital" &&
            c.stage !== "Pre-Seed" && c.stage !== "Seed" && c.stage !== "Series A"
              ? "Growth"
              : c.stage;
          if (stageList.includes(bucket)) {
            map[bucket] = (map[bucket] || 0) + c.fmv;
          }
        }
      }
      // Return in fixed order
      return stageList.filter((s) => map[s]).map((s) => ({ name: s, value: map[s] }));
    }

    // Theme-based grouping (All)
    for (const f of funds) {
      for (const c of f.companies) {
        map[c.theme] = (map[c.theme] || 0) + c.fmv;
      }
    }
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));
  }, [funds, dim]);

  const selectedLabel = MENU_OPTIONS.find((o) => o.value === dim)?.label || dim;

  return (
    <div className="bg-atlas-card border border-atlas-border rounded-[14px] p-5">
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm font-semibold text-atlas-white">{te.title}</div>
        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen(!open)}
            className="px-3 py-[5px] rounded-lg border border-atlas-border bg-transparent text-atlas-gray2 text-[12px] cursor-pointer flex items-center gap-1.5 hover:border-atlas-purple hover:text-atlas-purple transition-colors"
          >
            {selectedLabel}
            <span className="text-[10px]">&#x25BE;</span>
          </button>
          {open && (
            <div className="absolute right-0 top-full mt-1 w-[260px] bg-atlas-card border border-atlas-border rounded-xl shadow-2xl z-30 overflow-hidden">
              {(() => {
                let lastSection = "";
                return MENU_OPTIONS.map((opt) => {
                  const showSection = opt.section !== lastSection;
                  lastSection = opt.section;
                  return (
                    <div key={opt.value}>
                      {showSection && (
                        <>
                          {opt.section !== te.themeView && (
                            <div className="border-t border-atlas-border" />
                          )}
                          <div className="px-3 pt-2.5 pb-1 text-[9px] font-semibold text-atlas-gray3 uppercase tracking-widest">
                            {opt.section}
                          </div>
                        </>
                      )}
                      <button
                        onClick={() => {
                          setDim(opt.value);
                          setOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-[12px] cursor-pointer border-none transition-colors ${
                          dim === opt.value
                            ? "bg-atlas-purple-dim text-atlas-purple"
                            : "bg-transparent text-atlas-gray2 hover:bg-atlas-surface hover:text-atlas-white"
                        }`}
                      >
                        <div>{opt.label}</div>
                        {"subtitle" in opt && opt.subtitle && (
                          <div className="text-[10px] text-atlas-gray3 mt-0.5">
                            {opt.subtitle}
                          </div>
                        )}
                      </button>
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={Math.max(data.length * 36, 120)}>
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 20 }}>
          <XAxis type="number" hide />
          <YAxis
            dataKey="name"
            type="category"
            width={120}
            tick={{ fill: cc.tickLight, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<DarkTip />} cursor={{ fill: cc.cursorFill }} />
          <Bar dataKey="value" name="FMV" radius={[0, 4, 4, 0]} barSize={18}>
            {data.map((_, i) => (
              <Cell key={i} fill={cc.palette[i % cc.palette.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
