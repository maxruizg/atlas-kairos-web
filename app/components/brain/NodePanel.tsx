import { useEffect, useState } from "react";
import type { GraphNode, GraphNodeType } from "~/lib/graph/graph-types";

export interface PanelChip {
  id: string;
  label: string;
  type: GraphNodeType;
}
export interface PanelBacklink extends PanelChip {
  linkLabel: string;
}
export interface PanelMetric {
  label: string;
  value: string;
  tone?: "pos" | "neg" | "neutral";
}
export interface NodeDetail {
  metrics: PanelMetric[];
  navHistory: number[];
  chips: PanelChip[];
  documents: { id: string; label: string; href?: string }[];
  backlinks: PanelBacklink[];
}

export interface NodePanelProps {
  brain: any;
  node: GraphNode;
  typeName: string;
  detail: NodeDetail;
  notes: string;
  canEdit: boolean;
  riskColor: string;
  onClose: () => void;
  onSaveNotes: (text: string) => void;
  onFocusNode: (id: string) => void;
  onOpenDetail: (href: string) => void;
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (!values || values.length < 2) return null;
  const w = 200, h = 44, pad = 3;
  const min = Math.min(...values), max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / span) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} className="block" preserveAspectRatio="none">
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="1.5"
        strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function NodePanel(props: NodePanelProps) {
  const { brain, node, detail, canEdit } = props;
  const [draft, setDraft] = useState(props.notes);
  const [saved, setSaved] = useState(false);

  // Re-sync the textarea when a different node is opened.
  useEffect(() => { setDraft(props.notes); setSaved(false); }, [node.id, props.notes]);

  const save = () => {
    props.onSaveNotes(draft);
    setSaved(true);
  };

  return (
    <div className="absolute left-4 top-4 bottom-4 z-[120] w-[300px] flex flex-col bg-atlas-card/97 backdrop-blur border border-atlas-border rounded-xl shadow-xl animate-slide-in-right">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 px-4 pt-3.5 pb-3 border-b border-atlas-border">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-widest text-atlas-purple mb-0.5">{props.typeName}</div>
          <div className="text-[15px] font-bold text-atlas-white font-display leading-tight truncate">{node.label}</div>
          {node.sub && <div className="text-[11px] text-atlas-gray3 truncate">{node.sub}</div>}
        </div>
        <button onClick={props.onClose}
          className="shrink-0 w-6 h-6 rounded-md border border-atlas-border text-atlas-gray3 text-[13px] leading-none cursor-pointer hover:border-atlas-gray4 bg-transparent">×</button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {/* Metrics */}
        {detail.metrics.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {detail.metrics.map((m) => (
              <div key={m.label} className="bg-atlas-surface border border-atlas-border rounded-lg px-2.5 py-1.5">
                <div className="text-[9px] uppercase tracking-wide text-atlas-gray3">{m.label}</div>
                <div className={`text-[13px] font-mono font-semibold ${
                  m.tone === "pos" ? "text-atlas-green" : m.tone === "neg" ? "text-atlas-red" : "text-atlas-white"
                }`}>{m.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Sparkline */}
        {detail.navHistory.length >= 2 && (
          <div>
            <div className="text-[9px] font-bold uppercase tracking-widest text-atlas-gray3 mb-1">{brain.trend}</div>
            <div className="bg-atlas-surface border border-atlas-border rounded-lg p-2">
              <Sparkline values={detail.navHistory} color={props.riskColor} />
            </div>
          </div>
        )}

        {/* Connected concept chips */}
        {detail.chips.length > 0 && (
          <div>
            <div className="text-[9px] font-bold uppercase tracking-widest text-atlas-gray3 mb-1.5">{brain.connections}</div>
            <div className="flex flex-wrap gap-1.5">
              {detail.chips.map((c) => (
                <button key={c.id} onClick={() => props.onFocusNode(c.id)}
                  className="px-2 py-0.5 rounded-full border border-atlas-border bg-atlas-surface text-[10px] text-atlas-gray1 cursor-pointer hover:border-atlas-purple hover:text-atlas-purple transition-colors">
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Documents */}
        {detail.documents.length > 0 && (
          <div>
            <div className="text-[9px] font-bold uppercase tracking-widest text-atlas-gray3 mb-1.5">{brain.documents}</div>
            <div className="space-y-1">
              {detail.documents.map((d) => (
                <div key={d.id} className="text-[11px] text-atlas-gray1 bg-atlas-surface border border-atlas-border rounded-md px-2 py-1 truncate">
                  {d.label}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Backlinks */}
        <div>
          <div className="text-[9px] font-bold uppercase tracking-widest text-atlas-gray3 mb-1.5">{brain.backlinks}</div>
          {detail.backlinks.length === 0 ? (
            <div className="text-[11px] text-atlas-gray4 italic">{brain.noBacklinks}</div>
          ) : (
            <div className="space-y-1">
              {detail.backlinks.map((b) => (
                <button key={`${b.id}-${b.linkLabel}`} onClick={() => props.onFocusNode(b.id)}
                  className="w-full flex items-center justify-between gap-2 text-left px-2 py-1 rounded-md bg-atlas-surface border border-atlas-border cursor-pointer hover:border-atlas-purple transition-colors">
                  <span className="text-[11px] text-atlas-gray1 truncate">{b.label}</span>
                  <span className="text-[8px] uppercase tracking-wide text-atlas-gray4 shrink-0">{b.linkLabel}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notes / Thesis */}
        <div>
          <div className="text-[9px] font-bold uppercase tracking-widest text-atlas-gray3 mb-1.5">{brain.notesTitle}</div>
          <textarea
            value={draft}
            onChange={(e) => { setDraft(e.target.value); setSaved(false); }}
            disabled={!canEdit}
            placeholder={canEdit ? brain.notesPlaceholder : brain.notesReadOnly}
            rows={5}
            className="w-full bg-atlas-surface border border-atlas-border rounded-lg px-2.5 py-2 text-[12px] text-atlas-white outline-none focus:border-atlas-purple resize-none disabled:opacity-60 disabled:cursor-not-allowed"
          />
          {canEdit && (
            <div className="flex items-center justify-end gap-2 mt-1.5">
              {saved && <span className="text-[10px] text-atlas-green">{brain.saved}</span>}
              <button onClick={save} disabled={draft === props.notes}
                className="px-3 py-1 rounded-md bg-atlas-purple text-white text-[11px] font-semibold cursor-pointer border-none disabled:opacity-40 disabled:cursor-not-allowed">
                {brain.save}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer: open detail */}
      {node.href && (
        <div className="px-4 py-3 border-t border-atlas-border">
          <button onClick={() => props.onOpenDetail(node.href!)}
            className="w-full py-2 rounded-lg bg-atlas-purple-dim text-atlas-purple text-[12px] font-semibold cursor-pointer border border-atlas-purple hover:bg-atlas-purple-dim-hover transition-colors">
            {brain.openDetail} →
          </button>
        </div>
      )}
    </div>
  );
}
