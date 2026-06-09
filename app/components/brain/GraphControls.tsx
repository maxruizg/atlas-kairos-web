import { useState } from "react";
import type { GraphNodeType, LinkType } from "~/lib/graph/graph-types";
import type { ColorBy } from "~/lib/graph/graph-colors";

export interface ForceParams {
  linkDistance: number;
  charge: number;
  gravity: number;
}

export interface GraphControlsProps {
  brain: any; // t.brain translations slice
  nodeTypes: Record<string, boolean>;
  setNodeType: (type: GraphNodeType, on: boolean) => void;
  linkTypes: Record<string, boolean>;
  setLinkType: (type: LinkType, on: boolean) => void;
  scope: string | null;
  setScope: (id: string | null) => void;
  entities: { id: string; short: string; name: string }[];
  colorBy: ColorBy;
  setColorBy: (c: ColorBy) => void;
  forces: ForceParams;
  setForces: (f: ForceParams) => void;
  search: string;
  setSearch: (s: string) => void;
  onSearchSubmit: () => void;
  onReset: () => void;
  onRecenter: () => void;
}

const NODE_TYPE_KEYS: GraphNodeType[] = [
  "entity", "sponsor", "fund", "direct", "company", "theme", "geo", "vintage", "document",
];
const LINK_TYPE_KEYS: LinkType[] = [
  "ownership", "sponsor", "theme", "geo", "vintage", "strategy", "document",
];
const COLOR_BY_KEYS: ColorBy[] = ["assetClass", "risk", "performance", "entity"];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-atlas-border first:border-t-0 py-2.5">
      <div className="text-[9px] font-bold uppercase tracking-widest text-atlas-gray3 mb-1.5">{title}</div>
      {children}
    </div>
  );
}

function Toggle({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-1 rounded-md text-[10px] font-medium cursor-pointer border transition-colors ${
        on
          ? "border-atlas-purple bg-atlas-purple-dim text-atlas-purple"
          : "border-atlas-border bg-transparent text-atlas-gray4 hover:border-atlas-gray4"
      }`}
    >
      {label}
    </button>
  );
}

function Slider({
  label, value, min, max, step, onChange,
}: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <label className="block mb-2 last:mb-0">
      <span className="text-[10px] text-atlas-gray2">{label}</span>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-atlas-purple cursor-pointer"
      />
    </label>
  );
}

export function GraphControls(props: GraphControlsProps) {
  const { brain } = props;
  const [open, setOpen] = useState(true);

  return (
    <div className="absolute right-4 top-4 z-[120] w-[230px]">
      <div className="bg-atlas-card/95 backdrop-blur border border-atlas-border rounded-xl shadow-lg overflow-hidden">
        <button
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center justify-between px-3.5 py-2.5 cursor-pointer bg-transparent border-none"
        >
          <span className="text-[12px] font-bold text-atlas-white font-display">{brain.controls}</span>
          <span className="text-atlas-gray3 text-[12px]">{open ? "−" : "+"}</span>
        </button>

        {open && (
          <div className="px-3.5 pb-3 max-h-[calc(100vh-160px)] overflow-y-auto">
            {/* Search */}
            <Section title={brain.search}>
              <div className="flex gap-1.5">
                <input
                  value={props.search}
                  onChange={(e) => props.setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && props.onSearchSubmit()}
                  placeholder={brain.searchPlaceholder}
                  className="flex-1 min-w-0 bg-atlas-surface border border-atlas-border rounded-md px-2 py-1 text-[11px] text-atlas-white outline-none focus:border-atlas-purple"
                />
                <button
                  onClick={props.onSearchSubmit}
                  className="px-2 rounded-md bg-atlas-purple text-white text-[11px] cursor-pointer border-none"
                >→</button>
              </div>
            </Section>

            {/* Entity scope */}
            <Section title={brain.scope}>
              <div className="flex flex-wrap gap-1">
                <Toggle label={brain.all} on={props.scope === null} onClick={() => props.setScope(null)} />
                {props.entities.map((e) => (
                  <Toggle key={e.id} label={e.short} on={props.scope === e.id} onClick={() => props.setScope(e.id)} />
                ))}
              </div>
            </Section>

            {/* Color by */}
            <Section title={brain.colorBy}>
              <div className="flex flex-wrap gap-1">
                {COLOR_BY_KEYS.map((c) => (
                  <Toggle key={c} label={brain.colorByOpts[c]} on={props.colorBy === c} onClick={() => props.setColorBy(c)} />
                ))}
              </div>
            </Section>

            {/* Node filters */}
            <Section title={brain.filters}>
              <div className="flex flex-wrap gap-1">
                {NODE_TYPE_KEYS.map((nt) => (
                  <Toggle
                    key={nt}
                    label={brain.nodeTypes[nt]}
                    on={props.nodeTypes[nt] !== false}
                    onClick={() => props.setNodeType(nt, props.nodeTypes[nt] === false)}
                  />
                ))}
              </div>
            </Section>

            {/* Link filters */}
            <Section title={brain.linkTypes}>
              <div className="flex flex-wrap gap-1">
                {LINK_TYPE_KEYS.map((lt) => (
                  <Toggle
                    key={lt}
                    label={brain.linkTypeNames[lt]}
                    on={props.linkTypes[lt] !== false}
                    onClick={() => props.setLinkType(lt, props.linkTypes[lt] === false)}
                  />
                ))}
              </div>
            </Section>

            {/* Forces */}
            <Section title={brain.forces}>
              <Slider label={brain.linkDistance} value={props.forces.linkDistance} min={20} max={200} step={5}
                onChange={(v) => props.setForces({ ...props.forces, linkDistance: v })} />
              <Slider label={brain.charge} value={-props.forces.charge} min={20} max={600} step={10}
                onChange={(v) => props.setForces({ ...props.forces, charge: -v })} />
              <Slider label={brain.gravity} value={props.forces.gravity} min={0} max={1} step={0.02}
                onChange={(v) => props.setForces({ ...props.forces, gravity: v })} />
            </Section>

            {/* View actions */}
            <Section title={brain.view}>
              <div className="flex gap-1.5">
                <button onClick={props.onReset}
                  className="flex-1 py-1.5 rounded-md border border-atlas-border bg-transparent text-atlas-gray2 text-[10px] font-medium cursor-pointer hover:border-atlas-gray4">
                  {brain.reset}
                </button>
                <button onClick={props.onRecenter}
                  className="flex-1 py-1.5 rounded-md border border-atlas-border bg-transparent text-atlas-gray2 text-[10px] font-medium cursor-pointer hover:border-atlas-gray4">
                  {brain.recenter}
                </button>
              </div>
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}
