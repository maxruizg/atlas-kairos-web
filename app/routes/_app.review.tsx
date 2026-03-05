import { useLoaderData, useFetcher } from "react-router";
import { api } from "~/lib/api.server";
import type { ReviewDocument, ReviewField } from "~/lib/types";
import { FieldCard } from "~/components/ui/FieldCard";
import { ProgressBar } from "~/components/ui/ProgressBar";

export async function loader() {
  const review = await api.getReview("doc-001");
  return { review };
}

export async function action({ request }: { request: Request }) {
  const formData = await request.formData();
  const documentId = formData.get("documentId") as string;
  const fieldId = formData.get("fieldId") as string;
  const approved = formData.get("approved") === "true";
  await api.approveField(documentId, fieldId, approved);
  return { ok: true };
}

export default function Review() {
  const { review } = useLoaderData<{ review: ReviewDocument }>();
  const fetcher = useFetcher();

  // Optimistic: merge pending submissions
  const fields = review.fields.map((f) => {
    const pending = fetcher.formData;
    if (pending && pending.get("fieldId") === f.id) {
      return { ...f, approved: pending.get("approved") === "true" };
    }
    return f;
  });

  const reviewed = fields.filter((f) => f.approved !== null).length;
  const approvedCount = fields.filter((f) => f.approved === true).length;
  const pendingCount = fields.filter((f) => f.approved === null).length;

  function handleAction(fieldId: string, approved: boolean) {
    fetcher.submit(
      { documentId: review.id, fieldId, approved: String(approved) },
      { method: "post" }
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left: Document Preview */}
      <div className="w-[340px] border-r border-atlas-border bg-atlas-surface p-6 flex flex-col gap-3.5 overflow-auto">
        <div className="text-[13px] font-semibold text-atlas-white mb-1">Document Preview</div>
        <div className="bg-atlas-card border border-atlas-border rounded-[10px] p-4">
          <div className="text-[11px] text-atlas-gray4 mb-2 uppercase tracking-widest">
            {review.fund}
          </div>
          <div className="text-[13px] font-bold text-atlas-white mb-3">{review.doc_type}</div>
          <div className="h-px bg-atlas-border mb-3" />
          <div className="text-[11px] text-atlas-gray3 mb-1">
            Period Ending:{" "}
            <strong className="text-atlas-white">
              {fields.find((f) => f.key === "Period End")?.value || "\u2014"}
            </strong>
          </div>
          <div className="bg-atlas-surface rounded-md p-2.5 mt-2.5">
            <table className="w-full text-[11px] border-collapse">
              <tbody>
                {[
                  ["NAV", "$8,420,000"],
                  ["Paid-In Capital", "$6,200,000"],
                  ["Unfunded", "$1,800,000"],
                  ["YTD Distributions", "$380,000"],
                ].map(([label, value]) => (
                  <tr key={label}>
                    <td className="text-atlas-gray3 py-[3px]">{label}</td>
                    <td className="text-right text-atlas-white font-semibold font-mono">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Low confidence highlight */}
          <div className="mt-4 border border-atlas-orange rounded-md p-2 bg-atlas-orange-dim">
            <div className="text-[10px] text-atlas-orange font-bold">
              &#x26A0; Low confidence field
            </div>
            <div className="text-[10px] text-atlas-gray2 mt-0.5">
              Management Fees on page 4 &mdash; please verify value of $124,000
            </div>
          </div>
        </div>
        <div className="text-[10px] text-atlas-gray4">
          Page 1 of 6 &middot; Confidence: <span className="font-mono">{review.confidence}%</span>
        </div>
      </div>

      {/* Right: Fields */}
      <div className="flex-1 overflow-y-auto px-7 py-6 flex flex-col gap-4">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-lg font-bold text-atlas-white font-display">REVIEW EXTRACTION</h2>
            <p className="text-xs text-atlas-gray3 mt-0.5">
              {review.name} &middot; {review.doc_type}
            </p>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 rounded-lg border border-atlas-border bg-transparent text-atlas-gray2 text-xs cursor-pointer">
              Reject
            </button>
            <button className="px-4 py-2 rounded-lg border-none bg-atlas-green text-atlas-white text-xs cursor-pointer font-semibold">
              Approve &amp; Post to Ledger
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-atlas-card border border-atlas-border rounded-[10px] px-4 py-3 flex gap-6 items-center">
          <div className="flex-1">
            <div className="flex justify-between mb-[5px]">
              <span className="text-[11px] text-atlas-gray3">Review Progress</span>
              <span className="text-[11px] font-bold text-atlas-white font-mono">
                {reviewed}/{fields.length} fields reviewed
              </span>
            </div>
            <ProgressBar value={reviewed} max={fields.length} />
          </div>
          <div className="flex gap-3">
            <div className="text-center">
              <div className="text-base font-bold text-atlas-green font-mono">{approvedCount}</div>
              <div className="text-[10px] text-atlas-gray4">Approved</div>
            </div>
            <div className="text-center">
              <div className="text-base font-bold text-atlas-orange font-mono">{pendingCount}</div>
              <div className="text-[10px] text-atlas-gray4">Pending</div>
            </div>
          </div>
        </div>

        {/* Field Cards */}
        <div className="flex flex-col gap-2">
          {fields.map((f) => (
            <FieldCard
              key={f.id}
              field={f as ReviewField}
              onApprove={() => handleAction(f.id, true)}
              onReject={() => handleAction(f.id, false)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
