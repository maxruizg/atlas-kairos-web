import { useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router";
import type { ReviewField } from "~/lib/types";
import { FieldCard } from "~/components/ui/FieldCard";
import { ProgressBar } from "~/components/ui/ProgressBar";
import { useClientData } from "~/lib/client-data-context";
import { useDocViewer } from "~/lib/doc-viewer-context";
import { useCan, useGuard } from "~/lib/use-permissions";
import { useToast } from "~/lib/toast-context";
import { useT } from "~/lib/use-t";

export default function Review() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const docId = searchParams.get("doc") || "";
  const { documents, approveDocField, updateDocumentStatus, logAudit } = useClientData();
  const { openDocObject } = useDocViewer();
  const guard = useGuard();
  const cn = useCan();
  const { toast } = useToast();
  const t = useT();
  const tr = t.review;
  const da = t.docActions;

  const doc = useMemo(
    () => documents.find((d) => d.id === docId) || null,
    [documents, docId]
  );

  if (!doc) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="text-base font-semibold text-atlas-white mb-2">{tr.title}</div>
          <div className="text-xs text-atlas-gray3">
            {tr.noPending ??
              "No documents pending review. Upload a document from the Vault to extract fields."}
          </div>
        </div>
      </div>
    );
  }

  const fields: ReviewField[] = doc.extracted_fields || [];
  const reviewed = fields.filter((f) => f.approved !== null).length;
  const approvedCount = fields.filter((f) => f.approved === true).length;
  const pendingCount = fields.filter((f) => f.approved === null).length;
  const confidence = doc.confidence ?? 0;

  function handleField(fieldId: string, approved: boolean) {
    guard("document.approve", () => approveDocField(doc!.id, fieldId, approved));
  }

  function finalize(status: "Approved" | "Rejected") {
    guard("document.approve", () => {
      updateDocumentStatus(doc!.id, status);
      logAudit({
        action: status === "Approved" ? "approve" : "reject",
        entity: doc!.name,
        field: "status",
        old_value: doc!.status,
        new_value: status,
        screen: "Review",
      });
      toast(
        status === "Approved" ? tr.approvedToast ?? "Document approved and posted to ledger." : tr.rejectedToast ?? "Document rejected.",
        status === "Approved" ? "success" : "warning"
      );
      navigate("/vault");
    });
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left: Document summary */}
      <div className="w-[340px] border-r border-atlas-border bg-atlas-surface p-6 flex flex-col gap-3.5 overflow-auto">
        <div className="text-[13px] font-semibold text-atlas-white mb-1">{tr.documentPreview}</div>
        <div className="bg-atlas-card border border-atlas-border rounded-[10px] p-4">
          <div className="text-[11px] text-atlas-gray4 mb-2 uppercase tracking-widest">{doc.fund}</div>
          <div className="text-[13px] font-bold text-atlas-white mb-3">{doc.doc_type}</div>
          <div className="h-px bg-atlas-border mb-3" />
          {doc.period_end && (
            <div className="text-[11px] text-atlas-gray3 mb-2">
              {tr.periodEnding} <strong className="text-atlas-white">{doc.period_end}</strong>
            </div>
          )}
          {fields.length > 0 && (
            <div className="bg-atlas-surface rounded-md p-2.5 mt-1">
              <table className="w-full text-[11px] border-collapse">
                <tbody>
                  {fields.slice(0, 6).map((f) => (
                    <tr key={f.id}>
                      <td className="text-atlas-gray3 py-[3px]">{f.key}</td>
                      <td className="text-right text-atlas-white font-semibold font-mono">{f.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {doc.file_url && (
            <button
              onClick={() => openDocObject(doc)}
              className="mt-3 w-full px-3 py-2 rounded-md border border-atlas-border bg-transparent text-atlas-gray2 text-[11px] cursor-pointer hover:border-atlas-purple hover:text-atlas-purple transition-colors"
            >
              &#x2922; {da.view}
            </button>
          )}
        </div>
        <div className="text-[10px] text-atlas-gray4">
          {tr.pageOf(1, Math.max(1, doc.pages || 1))} &middot; {tr.confidence}{" "}
          <span className="font-mono">{confidence}%</span>
        </div>
      </div>

      {/* Right: Fields */}
      <div className="flex-1 overflow-y-auto px-7 py-6 flex flex-col gap-4">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-lg font-bold text-atlas-white font-display">{tr.title}</h2>
            <p className="text-xs text-atlas-gray3 mt-0.5">
              {doc.name} &middot; {doc.doc_type}
            </p>
          </div>
          {cn("document.approve") && doc.status === "Needs Review" && (
            <div className="flex gap-2">
              <button
                onClick={() => finalize("Rejected")}
                className="px-4 py-2 rounded-lg border border-atlas-border bg-transparent text-atlas-gray2 text-xs cursor-pointer hover:border-atlas-red hover:text-atlas-red transition-colors"
              >
                {tr.reject}
              </button>
              <button
                onClick={() => finalize("Approved")}
                className="px-4 py-2 rounded-lg border-none bg-atlas-green text-atlas-white text-xs cursor-pointer font-semibold"
              >
                {tr.approvePost}
              </button>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="bg-atlas-card border border-atlas-border rounded-[10px] px-4 py-3 flex gap-6 items-center">
          <div className="flex-1">
            <div className="flex justify-between mb-[5px]">
              <span className="text-[11px] text-atlas-gray3">{tr.reviewProgress}</span>
              <span className="text-[11px] font-bold text-atlas-white font-mono">
                {tr.fieldsReviewed(reviewed, fields.length)}
              </span>
            </div>
            <ProgressBar value={reviewed} max={Math.max(1, fields.length)} />
          </div>
          <div className="flex gap-3">
            <div className="text-center">
              <div className="text-base font-bold text-atlas-green font-mono">{approvedCount}</div>
              <div className="text-[10px] text-atlas-gray4">{tr.approvedLabel}</div>
            </div>
            <div className="text-center">
              <div className="text-base font-bold text-atlas-orange font-mono">{pendingCount}</div>
              <div className="text-[10px] text-atlas-gray4">{tr.pending}</div>
            </div>
          </div>
        </div>

        {/* Field Cards */}
        <div className="flex flex-col gap-2">
          {fields.map((f) => (
            <FieldCard
              key={f.id}
              field={f}
              onApprove={() => handleField(f.id, true)}
              onReject={() => handleField(f.id, false)}
            />
          ))}
          {fields.length === 0 && (
            <div className="text-xs text-atlas-gray3">{da.notExtracted}</div>
          )}
        </div>
      </div>
    </div>
  );
}
