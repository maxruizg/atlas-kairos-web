import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router";
import type { Document } from "~/lib/types";
import { StatusBadge } from "~/components/ui/StatusBadge";
import { useT } from "~/lib/use-t";

interface Props {
  doc: Document;
  /** Initial page to open the PDF at (from a citation). */
  page?: number;
  onClose: () => void;
}

/** Heuristic: is this document a spreadsheet (no inline preview)? */
function isSpreadsheet(doc: Document): boolean {
  const url = (doc.file_url || "").toLowerCase();
  if (url.endsWith(".xlsx") || url.endsWith(".xls") || url.endsWith(".csv")) return true;
  return /excel|capital log|spreadsheet|\.xlsx/i.test(doc.doc_type || "");
}

export function DocViewModal({ doc, page: initialPage, onClose }: Props) {
  const [page, setPage] = useState(initialPage && initialPage > 0 ? initialPage : 1);
  const totalPages = Math.max(1, doc.pages || 1);
  const navigate = useNavigate();
  const t = useT();
  const da = t.docActions;

  useEffect(() => {
    setPage(initialPage && initialPage > 0 ? initialPage : 1);
  }, [initialPage, doc.id]);

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

  const spreadsheet = isSpreadsheet(doc);
  const hasFile = !!doc.file_url;
  // The browser PDF viewer honors the #page=N fragment for navigation.
  const pdfSrc = hasFile ? `${doc.file_url}#page=${page}&view=FitH` : "";

  return createPortal(
    <div className="fixed inset-0 z-[300]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/75" onClick={onClose} />
      {/* Modal */}
      <div className="absolute inset-4 bg-atlas-card border border-atlas-border rounded-xl flex overflow-hidden animate-slide-in-right">
        {/* Close button */}
        <button
          onClick={onClose}
          title={da.close}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-lg flex items-center justify-center text-atlas-white hover:bg-atlas-surface transition-colors cursor-pointer text-lg"
        >
          &times;
        </button>

        {/* Left panel — preview */}
        <div className="w-[60%] bg-atlas-surface border-r border-atlas-border flex flex-col">
          {spreadsheet || !hasFile ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="bg-atlas-card border border-atlas-border rounded-xl p-7 max-w-sm w-full text-center">
                <div className="w-14 h-16 mx-auto mb-4 rounded-md bg-atlas-green-dim border border-atlas-green/30 flex items-center justify-center text-atlas-green font-bold text-[13px]">
                  {spreadsheet ? "XLSX" : "FILE"}
                </div>
                <div className="text-[14px] font-bold text-atlas-white mb-1">{doc.name}</div>
                <div className="text-[11px] text-atlas-gray3 mb-4">
                  {spreadsheet ? da.spreadsheet : da.noPreview} &middot; {doc.size}
                </div>
                {spreadsheet && (
                  <div className="text-left bg-atlas-surface rounded-lg p-3 mb-4">
                    <div className="text-[10px] text-atlas-gray4 uppercase tracking-wider mb-1.5">{da.sheets}</div>
                    <div className="text-[11px] text-atlas-gray2">Capital Log &middot; Summary</div>
                  </div>
                )}
                {hasFile && (
                  <a
                    href={doc.file_url || "#"}
                    download
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-atlas-purple text-atlas-white text-[12px] font-semibold no-underline cursor-pointer"
                  >
                    &#x2193; {da.downloadFile}
                  </a>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 p-3">
                <iframe
                  key={page}
                  src={pdfSrc}
                  title={doc.name}
                  className="w-full h-full rounded-lg bg-white border border-atlas-border"
                />
              </div>
              {totalPages > 1 && (
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
              )}
            </>
          )}
        </div>

        {/* Right panel — metadata + actions */}
        <div className="w-[40%] p-5 overflow-y-auto flex flex-col">
          <div className="text-[15px] font-bold text-atlas-white font-display mb-4 pr-8">{doc.name}</div>
          <div className="flex flex-col gap-2 mb-4">
            <Row label={t.vault.colType} value={doc.doc_type} />
            <Row label={t.vault.colFund} value={doc.fund} />
            <Row label={t.vault.colDate} value={doc.date} mono />
            <Row label={t.vault.colSize} value={doc.size} />
            <div className="flex justify-between text-[11px] items-center">
              <span className="text-atlas-gray3">{t.vault.colStatus}</span>
              <StatusBadge status={doc.status} />
            </div>
            {doc.confidence != null && (
              <div className="flex justify-between text-[11px]">
                <span className="text-atlas-gray3">{t.vault.colConfidence}</span>
                <span className={`font-bold font-mono ${confidenceColor(doc.confidence)}`}>{doc.confidence}%</span>
              </div>
            )}
            {doc.vehicle && <Row label="Vehicle" value={doc.vehicle} />}
            {doc.period_end && <Row label={t.review.periodEnding} value={doc.period_end} mono />}
          </div>

          {/* Extracted fields */}
          {doc.extracted_fields && doc.extracted_fields.length > 0 && (
            <div className="mb-4">
              <div className="border-t border-atlas-border my-3" />
              <div className="text-[10px] text-atlas-gray4 uppercase tracking-wider mb-2">{da.extractedFields}</div>
              <div className="flex flex-col gap-1.5">
                {doc.extracted_fields.map((f) => (
                  <div key={f.id} className="flex justify-between text-[11px]">
                    <span className="text-atlas-gray3">{f.key}</span>
                    <span className="text-atlas-white font-mono">{f.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-atlas-border my-3" />

          {/* Actions */}
          <div className="flex flex-col gap-2 mt-auto">
            {hasFile && (
              <a
                href={doc.file_url || "#"}
                download
                className="w-full text-center px-4 py-2 rounded-lg bg-atlas-purple text-atlas-white text-[12px] font-semibold no-underline cursor-pointer"
              >
                &#x2193; {da.download}
              </a>
            )}
            {doc.status === "Needs Review" && (
              <button
                onClick={() => {
                  onClose();
                  navigate(`/review?doc=${encodeURIComponent(doc.id)}`);
                }}
                className="w-full px-4 py-2 rounded-lg border border-atlas-orange bg-atlas-orange-dim text-atlas-orange text-[12px] font-semibold cursor-pointer"
              >
                {da.openInReview}
              </button>
            )}
            <button
              onClick={onClose}
              className="w-full px-4 py-2 rounded-lg border border-atlas-border bg-transparent text-atlas-gray2 text-[12px] cursor-pointer"
            >
              {da.close}
            </button>
          </div>

          {doc.status === "Approved" && (
            <div className="mt-3 bg-atlas-green-dim border border-atlas-green/20 rounded-lg px-3 py-2 text-[11px] text-atlas-green font-semibold">
              {da.verified}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between text-[11px] gap-3">
      <span className="text-atlas-gray3 shrink-0">{label}</span>
      <span className={`text-atlas-white text-right ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}
