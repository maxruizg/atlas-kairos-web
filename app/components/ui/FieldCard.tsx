import type { ReviewField } from "~/lib/types";

export function FieldCard({
  field,
  onApprove,
  onReject,
}: {
  field: ReviewField;
  onApprove: () => void;
  onReject: () => void;
}) {
  const borderColor = field.flagged
    ? "border-atlas-orange"
    : field.approved === true
      ? "border-atlas-green/20"
      : "border-atlas-border";

  return (
    <div
      className={`bg-atlas-card border ${borderColor} rounded-[10px] px-4 py-3 flex items-center gap-3 transition-colors duration-200`}
    >
      <div className="flex-1">
        <div className="flex gap-2 items-center mb-1">
          <span className="text-[11px] text-atlas-gray4 uppercase tracking-wider">
            {field.key}
          </span>
          {field.flagged && (
            <span className="text-[9px] bg-atlas-orange-dim text-atlas-orange px-1.5 py-px rounded font-bold">
              LOW CONFIDENCE
            </span>
          )}
        </div>
        <div className="text-sm font-semibold text-atlas-white font-mono">
          {field.value}
        </div>
        <div className="text-[10px] text-atlas-gray4 mt-0.5">
          Extracted from page {field.page} &middot; Confidence{" "}
          <span className="font-mono">{field.confidence}%</span>
        </div>
      </div>
      <div className="flex gap-1.5">
        <button
          onClick={onApprove}
          className={`w-8 h-8 rounded-lg border text-sm cursor-pointer transition-colors ${
            field.approved === true
              ? "border-atlas-green bg-atlas-green-dim text-atlas-green"
              : "border-atlas-border bg-transparent text-atlas-gray4 hover:border-atlas-green hover:text-atlas-green"
          }`}
        >
          &#x2713;
        </button>
        <button
          onClick={onReject}
          className={`w-8 h-8 rounded-lg border text-sm cursor-pointer transition-colors ${
            field.approved === false
              ? "border-atlas-red bg-atlas-red-dim text-atlas-red"
              : "border-atlas-border bg-transparent text-atlas-gray4 hover:border-atlas-red hover:text-atlas-red"
          }`}
        >
          &#x2715;
        </button>
      </div>
    </div>
  );
}
