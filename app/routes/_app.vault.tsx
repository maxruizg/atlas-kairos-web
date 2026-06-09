import { useState, useMemo } from "react";
import { useSearchParams, useFetcher, useNavigate } from "react-router";
import { handleUploadAction } from "~/lib/upload.server";
import type { Document } from "~/lib/types";
import { StatusBadge } from "~/components/ui/StatusBadge";
import { SponsorBadge } from "~/components/ui/SponsorBadge";
import { UploadModal } from "~/components/ui/UploadModal";
import { LinkTo } from "~/components/ui/LinkTo";
import { useClientData } from "~/lib/client-data-context";
import { useDocViewer } from "~/lib/doc-viewer-context";
import { sponsorPath } from "~/lib/nav";
import { useToast } from "~/lib/toast-context";
import { useT } from "~/lib/use-t";

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
  const { documents, sponsors } = useClientData();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { openDocObject } = useDocViewer();
  const activeStatus = searchParams.get("status") || "all";
  const [showUpload, setShowUpload] = useState(false);
  const fetcher = useFetcher();
  const { toast } = useToast();
  const t = useT();
  const tv = t.vault;
  const da = t.docActions;

  const sponsorMap = useMemo(() => {
    const map: Record<string, (typeof sponsors)[number]> = {};
    for (const s of sponsors) map[s.id] = s;
    return map;
  }, [sponsors]);

  const visible = useMemo(
    () => (activeStatus === "all" ? documents : documents.filter((d) => d.status === activeStatus)),
    [documents, activeStatus]
  );

  const STATUS_FILTERS: [string, string][] = [
    [tv.all, "all"],
    [tv.needsReview, "Needs Review"],
    [tv.extracted, "Extracted"],
    [tv.approved, "Approved"],
    [tv.uploaded, "Uploaded"],
  ];

  function download(d: Document) {
    if (!d.file_url) {
      toast(t.toast.downloadUnavailable, "warning");
      return;
    }
    const a = document.createElement("a");
    a.href = d.file_url;
    a.download = d.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

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
        <div className="text-[13px] text-atlas-gray2 font-medium">{tv.dragDrop}</div>
        <div className="text-[11px] text-atlas-gray4 mt-[3px]">{tv.supports}</div>
      </div>

      {/* Status Pills */}
      <div className="flex gap-2">
        {STATUS_FILTERS.map(([label, value]) => {
          const isActive = activeStatus === value;
          const count =
            value === "all" ? documents.length : documents.filter((d) => d.status === value).length;
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
                (h, i) => (
                  <th
                    key={i}
                    className="py-[9px] px-3.5 text-left text-[10.5px] font-semibold text-atlas-gray4 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {visible.map((d) => {
              const sp = d.sponsor_id ? sponsorMap[d.sponsor_id] : null;
              return (
                <tr
                  key={d.id}
                  onClick={() => {
                    if (d.status === "Needs Review") {
                      navigate(`/review?doc=${encodeURIComponent(d.id)}`);
                    } else {
                      openDocObject(d);
                    }
                  }}
                  className="border-t border-atlas-border cursor-pointer hover:bg-atlas-card-hover transition-colors"
                >
                  <td className="py-3 px-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-9 bg-atlas-border rounded flex items-center justify-center text-[9px] text-atlas-gray3 font-bold shrink-0">
                        {(d.file_url || "").toLowerCase().endsWith(".xlsx") ? "XLS" : "PDF"}
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
                      <LinkTo to={sponsorPath(sp.id)} variant="bare" stopPropagation title={sp.name}>
                        <SponsorBadge initials={sp.initials} color={sp.color} name={sp.name} />
                      </LinkTo>
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
                  <td className="py-3 px-3.5" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1">
                      {d.status === "Needs Review" && (
                        <button
                          onClick={() => navigate(`/review?doc=${encodeURIComponent(d.id)}`)}
                          className="px-2.5 h-7 rounded-md flex items-center justify-center bg-atlas-orange-dim text-atlas-orange hover:bg-atlas-orange/20 transition-colors cursor-pointer text-[11px] font-semibold"
                          title={da.goToReview}
                        >
                          {da.goToReview}
                        </button>
                      )}
                      <button
                        onClick={() => openDocObject(d)}
                        className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-atlas-purple-dim text-atlas-gray3 hover:text-atlas-purple transition-colors cursor-pointer text-xs"
                        title={da.view}
                      >
                        &#x2922;
                      </button>
                      <button
                        onClick={() => download(d)}
                        className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-atlas-purple-dim text-atlas-gray3 hover:text-atlas-purple transition-colors cursor-pointer text-xs"
                        title={da.download}
                      >
                        &#x2193;
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <UploadModal open={showUpload} onClose={() => setShowUpload(false)} fetcher={fetcher} />
    </div>
  );
}
