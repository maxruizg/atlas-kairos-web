import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import type { Document } from "~/lib/types";
import { StatusBadge } from "~/components/ui/StatusBadge";
import { useT } from "~/lib/use-t";

interface Props {
  doc: Document;
  onClose: () => void;
}

export function DocViewModal({ doc, onClose }: Props) {
  const [page, setPage] = useState(1);
  const totalPages = 6;
  const t = useT();
  const da = t.docActions;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  function confidenceColor(c: number): string {
    if (c >= 90) return "text-atlas-green";
    if (c >= 75) return "text-atlas-orange";
    return "text-atlas-red";
  }

  return createPortal(
    <div className="fixed inset-0 z-[300]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/75" onClick={onClose} />
      {/* Modal */}
      <div className="absolute inset-4 bg-atlas-card border border-atlas-border rounded-xl flex overflow-hidden animate-slide-in-right">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-lg flex items-center justify-center text-atlas-white hover:bg-atlas-surface transition-colors cursor-pointer text-lg"
        >
          &times;
        </button>

        {/* Left panel — PDF viewer placeholder */}
        <div className="w-[60%] bg-atlas-surface border-r border-atlas-border flex flex-col">
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="w-full h-full bg-atlas-gray5 rounded-lg flex items-center justify-center">
              <span className="text-atlas-gray3 text-sm font-medium">{doc.name}</span>
            </div>
          </div>
          <div className="flex items-center justify-center gap-3 py-3 border-t border-atlas-border">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="px-3 py-1 rounded-md border border-atlas-border bg-transparent text-atlas-gray2 text-xs cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              &larr; {da.previous}
            </button>
            <span className="text-[12px] text-atlas-gray2 font-mono">
              {da.pageOf(page, totalPages)}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1 rounded-md border border-atlas-border bg-transparent text-atlas-gray2 text-xs cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {da.next} &rarr;
            </button>
          </div>
        </div>

        {/* Right panel — metadata */}
        <div className="w-[40%] p-5 overflow-y-auto">
          <div className="text-[15px] font-bold text-atlas-white font-display mb-4">{doc.name}</div>
          <div className="flex flex-col gap-2 mb-4">
            <div className="flex justify-between text-[11px]">
              <span className="text-atlas-gray3">{t.vault.colType}</span>
              <span className="text-atlas-white">{doc.doc_type}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-atlas-gray3">{t.vault.colFund}</span>
              <span className="text-atlas-white">{doc.fund}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-atlas-gray3">{t.vault.colDate}</span>
              <span className="text-atlas-white font-mono">{doc.date}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-atlas-gray3">{t.vault.colSize}</span>
              <span className="text-atlas-white">{doc.size}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-atlas-gray3">{t.vault.colStatus}</span>
              <StatusBadge status={doc.status} />
            </div>
            {doc.confidence && (
              <div className="flex justify-between text-[11px]">
                <span className="text-atlas-gray3">{t.vault.colConfidence}</span>
                <span className={`font-bold font-mono ${confidenceColor(doc.confidence)}`}>{doc.confidence}%</span>
              </div>
            )}
          </div>
          <div className="border-t border-atlas-border my-4" />
          {doc.status === "Approved" && (
            <div className="bg-atlas-green-dim border border-atlas-green/20 rounded-lg px-3 py-2 text-[11px] text-atlas-green font-semibold">
              {da.verified}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
