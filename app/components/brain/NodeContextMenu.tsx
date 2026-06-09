import { useEffect, useRef } from "react";
import type { GraphNode } from "~/lib/graph/graph-types";

export interface ContextMenuState {
  x: number;
  y: number;
  node: GraphNode;
}

export interface NodeContextMenuProps {
  brain: any;
  state: ContextMenuState;
  canEdit: boolean;
  isPinned: boolean;
  onClose: () => void;
  onOpenDetail: () => void;
  onTogglePin: () => void;
  onAddNote: () => void;
  onHide: () => void;
  onExpandNeighbors: () => void;
}

function Item({ label, disabled, onClick }: { label: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="w-full text-left px-3 py-1.5 text-[11px] text-atlas-gray1 cursor-pointer hover:bg-atlas-card-hover hover:text-atlas-white bg-transparent border-none disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      {label}
    </button>
  );
}

export function NodeContextMenu(props: NodeContextMenuProps) {
  const { brain, state, canEdit } = props;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) props.onClose();
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", props.onClose, true);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", props.onClose, true);
    };
  }, [props]);

  return (
    <div
      ref={ref}
      className="fixed z-[200] min-w-[160px] py-1 bg-atlas-card border border-atlas-border rounded-lg shadow-xl"
      style={{ left: state.x, top: state.y }}
    >
      <div className="px-3 py-1 text-[10px] font-bold text-atlas-purple uppercase tracking-wide truncate border-b border-atlas-border mb-1">
        {state.node.label}
      </div>
      {state.node.href && <Item label={brain.ctxOpenDetail} onClick={props.onOpenDetail} />}
      <Item label={props.isPinned ? brain.ctxUnpin : brain.ctxPin} disabled={!canEdit} onClick={props.onTogglePin} />
      <Item label={brain.ctxAddNote} disabled={!canEdit} onClick={props.onAddNote} />
      <Item label={brain.ctxExpand} onClick={props.onExpandNeighbors} />
      <Item label={brain.ctxHide} disabled={!canEdit} onClick={props.onHide} />
    </div>
  );
}
