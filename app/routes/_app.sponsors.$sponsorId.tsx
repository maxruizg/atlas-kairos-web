import { useState, useMemo } from "react";
import { useLoaderData, Link } from "react-router";
import { api } from "~/lib/api.server";
import { getEntityFromRequest } from "~/lib/entity-context";
import { useMergedFunds } from "~/lib/use-merged-data";
import { useClientData } from "~/lib/client-data-context";
import { useDocViewer } from "~/lib/doc-viewer-context";
import type { Sponsor, Fund, Document } from "~/lib/types";
import { formatCurrency, formatMultiplier, formatIrr, irrColor } from "~/lib/utils";
import { SponsorBadge } from "~/components/ui/SponsorBadge";
import { StatusBadge } from "~/components/ui/StatusBadge";
import { AddFundDrawer } from "~/components/drawers/AddFundDrawer";
import { useToast } from "~/lib/toast-context";
import { useCan } from "~/lib/use-permissions";
import { useT } from "~/lib/use-t";

export async function loader({ request, params }: { request: Request; params: { sponsorId: string } }) {
  const entityId = getEntityFromRequest(request) || undefined;
  const [sponsor, funds] = await Promise.all([
    api.getSponsor(params.sponsorId),
    api.getFunds(entityId, params.sponsorId),
  ]);
  return { sponsor, funds };
}

export async function action({
  request,
  params,
}: {
  request: Request;
  params: { sponsorId: string };
}) {
  const form = await request.formData();
  const intent = form.get("intent");

  if (intent === "create-fund") {
    const payload = JSON.parse(String(form.get("fund") || "{}"));
    payload.sponsor_id = params.sponsorId;
    const result = await api.createFund(payload);
    if (!result.ok) return { intent, ok: false, error: result.error };
    return { intent, ok: true };
  }

  if (intent === "delete-fund") {
    const id = String(form.get("id") || "");
    if (!id) return { intent, ok: false, error: "Missing fund id" };
    const result = await api.deleteFund(id);
    if (!result.ok) return { intent, ok: false, error: result.error };
    return { intent, ok: true };
  }

  return { intent: "unknown", ok: false, error: "Unknown intent" };
}

const DOC_TYPES = ["All", "Capital Account Statement", "Quarterly Report", "Annual Report", "Financial Statement"];

function confidenceColor(c: number): string {
  if (c >= 90) return "text-atlas-green";
  if (c >= 75) return "text-atlas-orange";
  return "text-atlas-red";
}

export default function SponsorDetail() {
  const { sponsor, funds: loaderFunds } = useLoaderData<{
    sponsor: Sponsor;
    funds: Fund[];
  }>();
  const funds = useMergedFunds(loaderFunds);
  const { documents: allDocs } = useClientData();
  const { openDocObject } = useDocViewer();
  const t = useT();
  const sd = t.sponsorDetail;
  const da = t.docActions;
  const { toast } = useToast();

  const [showAddFund, setShowAddFund] = useState(false);
  const cn = useCan();
  const [activeTab, setActiveTab] = useState<"funds" | "documents">("funds");
  const [docTypeFilter, setDocTypeFilter] = useState("All");

  function downloadDoc(d: Document) {
    if (!d.file_url) return toast(t.toast.downloadUnavailable, "warning");
    const a = document.createElement("a");
    a.href = d.file_url;
    a.download = d.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  const totalCompanies = funds.reduce((s, f) => s + f.companies.length, 0);

  const sponsorDocs = useMemo(() => {
    return allDocs.filter((d) => d.sponsor_id === sponsor.id);
  }, [allDocs, sponsor.id]);

  const filteredDocs = useMemo(() => {
    if (docTypeFilter === "All") return sponsorDocs;
    return sponsorDocs.filter((d) => d.doc_type === docTypeFilter);
  }, [sponsorDocs, docTypeFilter]);

  const docTypeCounts = useMemo(() => {
    const counts: Record<string, number> = { All: sponsorDocs.length };
    for (const dt of DOC_TYPES.slice(1)) counts[dt] = sponsorDocs.filter((d) => d.doc_type === dt).length;
    return counts;
  }, [sponsorDocs]);

  return (
    <div className="flex-1 overflow-y-auto p-7 flex flex-col gap-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs">
        <Link to="/sponsors" className="text-atlas-gray3 hover:text-atlas-purple no-underline">
          {t.sidebar.sponsors}
        </Link>
        <span className="text-atlas-gray4">/</span>
        <span className="text-atlas-white">{sponsor.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-4">
        <SponsorBadge initials={sponsor.initials} color={sponsor.color} size="lg" />
        <div>
          <h1 className="text-[22px] font-bold text-atlas-white font-display">{sponsor.name}</h1>
          <p className="text-[13px] text-atlas-gray3 mt-0.5">
            {sponsor.country} &middot; {sponsor.fund_count} {sd.funds.toLowerCase()} &middot; {totalCompanies} {sd.companies.toLowerCase()}
          </p>
        </div>
        {cn("fund.add") && (
          <button
            onClick={() => setShowAddFund(true)}
            className="ml-auto px-3.5 py-[7px] rounded-lg border-none bg-atlas-purple text-atlas-white text-xs cursor-pointer font-semibold"
          >
            + {t.drawers.addFund}
          </button>
        )}
      </div>

      {/* Aggregate Metrics */}
      <div className="grid grid-cols-6 gap-3">
        {[
          { label: sd.totalNav, value: formatCurrency(sponsor.total_nav), color: "text-atlas-white", title: undefined as string | undefined },
          { label: sd.commitment, value: formatCurrency(sponsor.total_commitment), color: "text-atlas-white" },
          { label: sd.tvpi, value: formatMultiplier(sponsor.tvpi), color: "text-atlas-purple" },
          { label: sd.netIrr, value: formatIrr(sponsor.net_irr), color: irrColor(sponsor.net_irr), title: formatIrr(sponsor.net_irr, 4) },
          { label: sd.funds, value: String(sponsor.fund_count), color: "text-atlas-white" },
          { label: sd.companies, value: String(totalCompanies), color: "text-atlas-white" },
        ].map((m) => (
          <div key={m.label} className="bg-atlas-card border border-atlas-border rounded-xl px-4 py-3">
            <div className="text-[10px] text-atlas-gray3 uppercase tracking-widest mb-1">{m.label}</div>
            <div className={`text-[18px] font-bold font-mono ${m.color}`} title={m.title}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab("funds")}
          className={`px-3 py-[5px] rounded-full border text-xs font-semibold cursor-pointer transition-colors ${
            activeTab === "funds"
              ? "border-atlas-purple bg-atlas-purple-dim text-atlas-purple"
              : "border-atlas-border bg-transparent text-atlas-gray3 hover:border-atlas-gray4"
          }`}
        >
          {sd.fundsTitle} ({funds.length})
        </button>
        <button
          onClick={() => setActiveTab("documents")}
          className={`px-3 py-[5px] rounded-full border text-xs font-semibold cursor-pointer transition-colors ${
            activeTab === "documents"
              ? "border-atlas-purple bg-atlas-purple-dim text-atlas-purple"
              : "border-atlas-border bg-transparent text-atlas-gray3 hover:border-atlas-gray4"
          }`}
        >
          {t.fundDetail.documents} ({sponsorDocs.length})
        </button>
      </div>

      {/* Funds Tab */}
      {activeTab === "funds" && (
        <div className="flex flex-col gap-3">
          {funds.map((f) => (
            <Link
              key={f.id}
              to={`/sponsors/${sponsor.id}/${f.id}`}
              className="bg-atlas-card border border-atlas-border rounded-[14px] p-5 hover:border-atlas-border-bright transition-colors no-underline group"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-[14px] font-semibold text-atlas-white group-hover:text-atlas-purple-light transition-colors">
                    {f.name}
                  </div>
                  <div className="text-[11px] text-atlas-gray3 mt-0.5">
                    {f.strategy} &middot; {f.vintage} &middot; {f.geography} &middot; {f.companies.length} {sd.companies.toLowerCase()}
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-atlas-purple-dim text-atlas-purple-light font-semibold">
                  {f.asset_class}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-4 mt-4">
                <div>
                  <div className="text-[9px] text-atlas-gray3 uppercase tracking-widest mb-0.5">{sd.netIrr}</div>
                  <div className={`text-sm font-bold font-mono ${irrColor(f.net_irr)}`} title={formatIrr(f.net_irr, 4)}>
                    {formatIrr(f.net_irr)}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] text-atlas-gray3 uppercase tracking-widest mb-0.5">{sd.tvpi}</div>
                  <div className="text-sm font-bold text-atlas-purple font-mono">{formatMultiplier(f.tvpi)}</div>
                </div>
                <div>
                  <div className="text-[9px] text-atlas-gray3 uppercase tracking-widest mb-0.5">NAV</div>
                  <div className="text-sm font-bold text-atlas-white font-mono">{formatCurrency(f.nav)}</div>
                </div>
                <div>
                  <div className="text-[9px] text-atlas-gray3 uppercase tracking-widest mb-0.5">{sd.paidIn}</div>
                  <div className="text-sm font-bold text-atlas-white font-mono">{formatCurrency(f.paid_in)}</div>
                </div>
                <div>
                  <div className="text-[9px] text-atlas-gray3 uppercase tracking-widest mb-0.5">{sd.pctCalled}</div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-atlas-white font-mono">{f.pct_called.toFixed(0)}%</span>
                    <div className="w-16 h-[4px] bg-atlas-border rounded-sm overflow-hidden">
                      <div className="h-full bg-atlas-purple rounded-sm" style={{ width: `${f.pct_called}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Documents Tab */}
      {activeTab === "documents" && (
        <div className="flex flex-col gap-4">
          {/* Type filter pills */}
          <div className="flex gap-2">
            {DOC_TYPES.map((dt) => (
              <button
                key={dt}
                onClick={() => setDocTypeFilter(dt)}
                className={`px-3 py-[5px] rounded-full border text-xs font-semibold cursor-pointer transition-colors flex gap-1.5 items-center ${
                  docTypeFilter === dt
                    ? "border-atlas-purple bg-atlas-purple-dim text-atlas-purple"
                    : "border-atlas-border bg-transparent text-atlas-gray3 hover:border-atlas-gray4"
                }`}
              >
                {dt === "All" ? da.allTypes : dt}
                <span className="bg-atlas-border rounded-[10px] px-1.5 text-[10px] text-atlas-gray3">
                  {docTypeCounts[dt] || 0}
                </span>
              </button>
            ))}
          </div>

          {/* Documents table */}
          <div className="bg-atlas-card border border-atlas-border rounded-[14px]">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-atlas-surface">
                  {[t.vault.colDocument, t.vault.colType, t.vault.colFund, t.vault.colConfidence, t.vault.colDate, t.vault.colSize, t.vault.colStatus, ""].map((h) => (
                    <th key={h} className="py-[9px] px-3.5 text-left text-[10.5px] font-semibold text-atlas-gray4 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredDocs.map((d) => (
                  <tr
                    key={d.id}
                    onClick={() => openDocObject(d)}
                    className="border-t border-atlas-border hover:bg-atlas-card-hover transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-9 bg-atlas-border rounded flex items-center justify-center text-[9px] text-atlas-gray3 font-bold shrink-0">{(d.file_url || "").toLowerCase().endsWith(".xlsx") ? "XLS" : "PDF"}</div>
                        <div>
                          <div className="text-[12.5px] font-semibold text-atlas-white">{d.name}</div>
                          <div className="text-[10px] text-atlas-gray4">{d.size}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3.5 text-[11.5px] text-atlas-gray2">{d.doc_type}</td>
                    <td className="py-3 px-3.5 text-[11.5px] text-atlas-gray3">{d.fund.split(" ").slice(0, 2).join(" ")}</td>
                    <td className="py-3 px-3.5">
                      {d.confidence ? (
                        <span className={`text-xs font-bold font-mono ${confidenceColor(d.confidence)}`}>{d.confidence}%</span>
                      ) : (
                        <span className="text-atlas-gray4 text-xs">&mdash;</span>
                      )}
                    </td>
                    <td className="py-3 px-3.5 text-[11.5px] text-atlas-gray3 font-mono">{d.date}</td>
                    <td className="py-3 px-3.5 text-[11.5px] text-atlas-gray3">{d.size}</td>
                    <td className="py-3 px-3.5"><StatusBadge status={d.status} /></td>
                    <td className="py-3 px-3.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <button onClick={() => openDocObject(d)} className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-atlas-purple-dim text-atlas-gray3 hover:text-atlas-purple transition-colors cursor-pointer text-xs" title={da.view}>&#x2922;</button>
                        <button onClick={() => downloadDoc(d)} className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-atlas-purple-dim text-atlas-gray3 hover:text-atlas-purple transition-colors cursor-pointer text-xs" title={da.download}>&#x2193;</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredDocs.length === 0 && (
                  <tr><td colSpan={8} className="py-6 text-center text-[12px] text-atlas-gray4">{da.noDocuments}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AddFundDrawer open={showAddFund} onClose={() => setShowAddFund(false)} sponsorId={sponsor.id} />
    </div>
  );
}
