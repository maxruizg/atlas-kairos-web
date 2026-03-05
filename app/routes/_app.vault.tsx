import { useState, useMemo } from "react";
import { useLoaderData, useSearchParams, useFetcher, Link } from "react-router";
import { api } from "~/lib/api.server";
import { handleUploadAction } from "~/lib/upload.server";
import type { Document, Sponsor } from "~/lib/types";
import { StatusBadge } from "~/components/ui/StatusBadge";
import { SponsorBadge } from "~/components/ui/SponsorBadge";
import { UploadModal } from "~/components/ui/UploadModal";

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

const STATUS_FILTERS: [string, string][] = [
  ["All", "all"],
  ["Needs Review", "Needs Review"],
  ["Extracted", "Extracted"],
  ["Approved", "Approved"],
  ["Uploaded", "Uploaded"],
];

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
  const fetcher = useFetcher();

  const sponsorMap = useMemo(() => {
    const map: Record<string, Sponsor> = {};
    for (const s of sponsors) map[s.id] = s;
    return map;
  }, [sponsors]);

  return (
    <div className="flex-1 overflow-y-auto p-7 flex flex-col gap-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-[22px] font-bold text-atlas-white font-display">Document Vault</h1>
          <p className="text-[13px] text-atlas-gray3 mt-0.5">
            {documents.length} documents &middot;{" "}
            {documents.filter((d) => d.status === "Needs Review").length} pending review
          </p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="px-[18px] py-[9px] rounded-lg border-none bg-atlas-purple text-atlas-white text-[13px] cursor-pointer font-semibold"
        >
          Upload Documents
        </button>
      </div>

      {/* Upload Drop Zone */}
      <div
        onClick={() => setShowUpload(true)}
        className="border-[1.5px] border-dashed border-atlas-border rounded-[14px] p-5 text-center bg-atlas-card cursor-pointer hover:border-atlas-purple transition-colors"
      >
        <div className="text-[28px] mb-1.5">&oplus;</div>
        <div className="text-[13px] text-atlas-gray2 font-medium">
          Drag &amp; drop PDFs or XLSX files
        </div>
        <div className="text-[11px] text-atlas-gray4 mt-[3px]">
          Supports: Capital Calls &middot; Distributions &middot; Statements &middot; Quarterly
          Reports
        </div>
      </div>

      {/* Status Pills */}
      <div className="flex gap-2">
        {STATUS_FILTERS.map(([label, value]) => {
          const isActive = activeStatus === value;
          const count =
            value === "all"
              ? documents.length
              : documents.filter((d) => d.status === label).length;
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
              } ${statusColor[label] || "text-atlas-gray3"}`}
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
              {["Document", "Type", "Sponsor", "Fund", "Confidence", "Date", "Size", "Status", ""].map(
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
                    {d.status === "Needs Review" && (
                      <Link
                        to="/review"
                        className="px-2.5 py-1 rounded-md border border-atlas-orange bg-atlas-orange-dim text-atlas-orange text-[11px] font-semibold no-underline"
                      >
                        Review
                      </Link>
                    )}
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
