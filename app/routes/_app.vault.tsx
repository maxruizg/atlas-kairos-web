import { useState, useMemo } from "react";
import { useLoaderData, useSearchParams, useFetcher, Link } from "react-router";
import { api } from "~/lib/api.server";
import { handleUploadAction } from "~/lib/upload.server";
import type { Document, Sponsor } from "~/lib/types";
import { StatusBadge } from "~/components/ui/StatusBadge";
import { SponsorBadge } from "~/components/ui/SponsorBadge";
import { UploadModal } from "~/components/ui/UploadModal";
import { DocViewModal } from "~/components/ui/DocViewModal";
import { useToast } from "~/lib/toast-context";
import { useT } from "~/lib/use-t";

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const status = url.searchParams.get("status") || undefined;
  const [documents, sponsors] = await Promise.all([
    api.getDocuments(status),
    api.getSponsors(),
  ]);
  return { documents, sponsors, activeStatus: status || "all" };
}

export async function action({ request }: { request: Request }) {
  return handleUploadAction(request);
}

const statusColor: Record<string, string> = {
  all: "text-atlas-gray3",
  "Needs Review": "text-atlas-orange",
  Extracted: "text-atlas-blue",
  Approved: "text-atlas-green",
  Uploaded: "text-atlas-gray3",
};

function confidenceColor(c: number): string {
  if (c >= 90) return "text-atlas-green";
  if (c >= 75) return "text-atlas-orange";
  return "text-atlas-red";
}

export default function Vault() {
  const { documents, sponsors, activeStatus } = useLoaderData<{
    documents: Document[];
    sponsors: Sponsor[];
    activeStatus: string;
  }>();
  const [, setSearchParams] = useSearchParams();
  const [showUpload, setShowUpload] = useState(false);
  const [previewDocId, setPreviewDocId] = useState<string | null>(null);
  const [viewDoc, setViewDoc] = useState<Document | null>(null);
  const fetcher = useFetcher();
  const { toast } = useToast();
  const t = useT();
  const tv = t.vault;
  const da = t.docActions;

  const sponsorMap = useMemo(() => {
    const map: Record<string, Sponsor> = {};
    for (const s of sponsors) map[s.id] = s;
    return map;
  }, [sponsors]);

  // Status filters with translated labels but English API values
  const STATUS_FILTERS: [string, string][] = [
    [tv.all, "all"],
    [tv.needsReview, "Needs Review"],
    [tv.extracted, "Extracted"],
    [tv.approved, "Approved"],
    [tv.uploaded, "Uploaded"],
  ];

  // Map API status values to translated labels for matching
  const statusApiToLabel: Record<string, string> = {
    "Needs Review": tv.needsReview,
    Extracted: tv.extracted,
    Approved: tv.approved,
    Uploaded: tv.uploaded,
  };

  return (
    <div className="flex-1 overflow-y-auto p-7 flex flex-col gap-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-[22px] font-bold text-atlas-white font-display">{tv.title}</h1>
          <p className="text-[13px] text-atlas-gray3 mt-0.5">
            {tv.subtitle(
              documents.length,
              documents.filter((d) => d.status === "Needs Review").length
            )}
          </p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="px-[18px] py-[9px] rounded-lg border-none bg-atlas-purple text-atlas-white text-[13px] cursor-pointer font-semibold"
        >
          {tv.uploadDocuments}
        </button>
      </div>

      {/* Upload Drop Zone */}
      <div
        onClick={() => setShowUpload(true)}
        className="border-[1.5px] border-dashed border-atlas-border rounded-[14px] p-5 text-center bg-atlas-card cursor-pointer hover:border-atlas-purple transition-colors"
      >
        <div className="text-[28px] mb-1.5">&oplus;</div>
        <div className="text-[13px] text-atlas-gray2 font-medium">
          {tv.dragDrop}
        </div>
        <div className="text-[11px] text-atlas-gray4 mt-[3px]">
          {tv.supports}
        </div>
      </div>

      {/* Status Pills */}
      <div className="flex gap-2">
        {STATUS_FILTERS.map(([label, value]) => {
          const isActive = activeStatus === value;
          const count =
            value === "all"
              ? documents.length
              : documents.filter((d) => d.status === value).length;
          return (
            <button
              key={value}
              onClick={() =>
                setSearchParams(value === "all" ? {} : { status: value }, {
                  preventScrollReset: true,
                })
              }
              className={`px-3 py-[5px] rounded-full bg-atlas-card border flex gap-1.5 items-center text-xs font-semibold cursor-pointer transition-colors ${
                isActive ? "border-atlas-purple" : "border-atlas-border"
              } ${statusColor[value] || "text-atlas-gray3"}`}
            >
              {label}
              <span className="bg-atlas-border rounded-[10px] px-1.5 text-[10px] text-atlas-gray3">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Document Table */}
      <div className="bg-atlas-card border border-atlas-border rounded-[14px]">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-atlas-surface">
              {[tv.colDocument, tv.colType, tv.colSponsor, tv.colFund, tv.colConfidence, tv.colDate, tv.colSize, tv.colStatus, ""].map(
                (h) => (
                  <th
                    key={h}
                    className="py-[9px] px-3.5 text-left text-[10.5px] font-semibold text-atlas-gray4 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {documents.map((d) => {
              const sp = d.sponsor_id ? sponsorMap[d.sponsor_id] : null;
              return (
                <>
                <tr
                  key={d.id}
                  className="border-t border-atlas-border cursor-pointer hover:bg-atlas-card-hover transition-colors"
                >
                  <td className="py-3 px-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-9 bg-atlas-border rounded flex items-center justify-center text-[9px] text-atlas-gray3 font-bold shrink-0">
                        PDF
                      </div>
                      <div>
                        <div className="text-[12.5px] font-semibold text-atlas-white">{d.name}</div>
                        <div className="text-[10px] text-atlas-gray4">{d.size}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3.5 text-[11.5px] text-atlas-gray2">{d.doc_type}</td>
                  <td className="py-3 px-3.5">
                    {sp ? (
                      <SponsorBadge initials={sp.initials} color={sp.color} name={sp.name} />
                    ) : (
                      <span className="text-atlas-gray4 text-xs">&mdash;</span>
                    )}
                  </td>
                  <td className="py-3 px-3.5 text-[11.5px] text-atlas-gray3">
                    {d.fund.split(" ").slice(0, 2).join(" ")}
                  </td>
                  <td className="py-3 px-3.5">
                    {d.confidence ? (
                      <span className={`text-xs font-bold font-mono ${confidenceColor(d.confidence)}`}>
                        {d.confidence}%
                      </span>
                    ) : (
                      <span className="text-atlas-gray4 text-xs">&mdash;</span>
                    )}
                  </td>
                  <td className="py-3 px-3.5 text-[11.5px] text-atlas-gray3 font-mono">{d.date}</td>
                  <td className="py-3 px-3.5 text-[11.5px] text-atlas-gray3">{d.size}</td>
                  <td className="py-3 px-3.5">
                    <StatusBadge status={d.status} />
                  </td>
                  <td className="py-3 px-3.5">
                    <div className="flex gap-1">
                      <button
                        onClick={() => setPreviewDocId(previewDocId === d.id ? null : d.id)}
                        className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-atlas-purple-dim text-atlas-gray3 hover:text-atlas-purple transition-colors cursor-pointer text-xs"
                        title={da.preview}
                      >
                        &#x25A3;
                      </button>
                      <button
                        onClick={() => setViewDoc(d)}
                        className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-atlas-purple-dim text-atlas-gray3 hover:text-atlas-purple transition-colors cursor-pointer text-xs"
                        title={da.view}
                      >
                        &#x2922;
                      </button>
                      <button
                        onClick={() => toast(t.toast.downloadUnavailable, "warning")}
                        className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-atlas-purple-dim text-atlas-gray3 hover:text-atlas-purple transition-colors cursor-pointer text-xs"
                        title={da.download}
                      >
                        &#x2193;
                      </button>
                    </div>
                  </td>
                </tr>
                {previewDocId === d.id && (
                  <tr key={`${d.id}-preview`}>
                    <td colSpan={9} className="bg-atlas-surface border-t border-atlas-border p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="text-[13px] font-semibold text-atlas-white">{d.name}</div>
                          <div className="text-[11px] text-atlas-gray3 mt-1">
                            {d.doc_type} &middot; {sp ? sp.name : "\u2014"} &middot; {d.fund} &middot; {d.date} &middot; {d.size}
                            {d.confidence ? ` \u00B7 ${d.confidence}%` : ""}
                          </div>
                        </div>
                        <button
                          onClick={() => setPreviewDocId(null)}
                          className="text-atlas-gray3 hover:text-atlas-white cursor-pointer text-sm"
                        >
                          &times;
                        </button>
                      </div>
                      {d.status === "Approved" && (
                        <div className="bg-atlas-green-dim border border-atlas-green/20 rounded-lg px-3 py-2 text-[11px] text-atlas-green font-semibold">
                          {da.verified}
                        </div>
                      )}
                      {d.status === "Needs Review" && (
                        <div className="bg-atlas-orange-dim border border-atlas-orange/20 rounded-lg px-3 py-2 text-[11px] text-atlas-orange font-semibold flex items-center gap-2">
                          {da.pendingReview}
                          <Link to="/review" className="text-atlas-orange underline text-[11px]">{da.goToReview}</Link>
                        </div>
                      )}
                      {d.status !== "Approved" && d.status !== "Needs Review" && (
                        <div className="bg-atlas-gray5 border border-atlas-border rounded-lg px-3 py-2 text-[11px] text-atlas-gray3">
                          {da.notExtracted}
                        </div>
                      )}
                    </td>
                  </tr>
                )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      <UploadModal open={showUpload} onClose={() => setShowUpload(false)} fetcher={fetcher} />
      {viewDoc && <DocViewModal doc={viewDoc} onClose={() => setViewDoc(null)} />}
    </div>
  );
}
