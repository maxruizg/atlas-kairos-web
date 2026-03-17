import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import type { FetcherWithComponents } from "react-router";
import { useT } from "~/lib/use-t";

const DOC_TYPES = [
  "Capital Account Statement",
  "Quarterly Report",
  "Annual Report",
  "Financial Statement",
];

const FUNDS = [
  "Apex Growth Fund III",
  "Infrastructure Partners IV",
  "TechBridge Direct Co-invest",
  "Meridian PE Fund II",
  "HealthCo Ventures I",
  "Apex Secondaries Fund I",
];

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
  fetcher: FetcherWithComponents<any>;
}

export function UploadModal({ open, onClose, fetcher }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState(DOC_TYPES[0]);
  const [fund, setFund] = useState(FUNDS[0]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = useT();
  const tu = t.upload;

  const isSubmitting = fetcher.state !== "idle";

  // Map API values to translated display labels
  const docTypeLabels: Record<string, string> = {
    "Capital Account Statement": tu.capitalAccountStatement,
    "Quarterly Report": tu.quarterlyReport,
    "Annual Report": tu.annualReport,
    "Financial Statement": tu.financialStatement,
  };

  // Close on success.
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.document) {
      setFile(null);
      onClose();
    }
  }, [fetcher.state, fetcher.data, onClose]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const handleFile = useCallback((f: File) => {
    const ext = f.name.split(".").pop()?.toLowerCase();
    if (ext === "pdf" || ext === "xlsx") {
      setFile(f);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  const handleSubmit = () => {
    if (!file || isSubmitting) return;
    const formData = new FormData();
    formData.append("file", file, file.name);
    formData.append("doc_type", docType);
    formData.append("fund", fund);
    fetcher.submit(formData, { method: "POST", encType: "multipart/form-data" });
  };

  if (!open) return null;

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-atlas-card border border-atlas-border rounded-2xl w-full max-w-[480px] p-6 shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold text-atlas-white">{tu.title}</h2>
          <button
            onClick={onClose}
            className="text-atlas-gray3 hover:text-atlas-white text-xl cursor-pointer bg-transparent border-none leading-none"
          >
            &times;
          </button>
        </div>

        {/* Drop zone */}
        <div
          className={`border-[1.5px] border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors mb-4 ${
            dragOver
              ? "border-atlas-purple bg-atlas-purple-dim"
              : file
                ? "border-atlas-green bg-atlas-green/5"
                : "border-atlas-border bg-atlas-surface hover:border-atlas-purple"
          }`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.xlsx"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          {file ? (
            <div>
              <div className="text-sm font-semibold text-atlas-white">{file.name}</div>
              <div className="text-xs text-atlas-gray3 mt-1">{formatSize(file.size)}</div>
            </div>
          ) : (
            <div>
              <div className="text-2xl mb-1">&oplus;</div>
              <div className="text-sm text-atlas-gray2 font-medium">
                {tu.dragDrop}
              </div>
              <div className="text-[11px] text-atlas-gray4 mt-1">{tu.fileHint}</div>
            </div>
          )}
        </div>

        {/* Document Type */}
        <label className="block mb-3">
          <span className="text-xs font-semibold text-atlas-gray2 mb-1.5 block">
            {tu.docType}
          </span>
          <select
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            className="w-full bg-atlas-surface border border-atlas-border rounded-lg px-3 py-2 text-sm text-atlas-white appearance-none cursor-pointer"
          >
            {DOC_TYPES.map((dt) => (
              <option key={dt} value={dt}>
                {docTypeLabels[dt] || dt}
              </option>
            ))}
          </select>
        </label>

        {/* Fund */}
        <label className="block mb-5">
          <span className="text-xs font-semibold text-atlas-gray2 mb-1.5 block">{tu.fund}</span>
          <select
            value={fund}
            onChange={(e) => setFund(e.target.value)}
            className="w-full bg-atlas-surface border border-atlas-border rounded-lg px-3 py-2 text-sm text-atlas-white appearance-none cursor-pointer"
          >
            {FUNDS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>

        {/* Error */}
        {fetcher.data?.error && (
          <div className="text-xs text-atlas-red mb-3">{fetcher.data.error}</div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-atlas-border bg-transparent text-atlas-gray2 text-sm cursor-pointer font-medium"
          >
            {tu.cancel}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!file || isSubmitting}
            className="px-4 py-2 rounded-lg border-none bg-atlas-purple text-atlas-white text-sm cursor-pointer font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? tu.uploading : tu.upload}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
