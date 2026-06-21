import { useState, useMemo } from "react";
import { useParams, Link } from "react-router";
import { useClientData } from "~/lib/client-data-context";
import { useDocViewer } from "~/lib/doc-viewer-context";
import { HelpFootnote } from "~/components/ui/HelpFootnote";
import { useEntity } from "~/lib/entity-context";
import { useToast } from "~/lib/toast-context";
import { useCan, useGuard } from "~/lib/use-permissions";
import { useT } from "~/lib/use-t";
import { formatCurrency, formatMultiplier, formatIrr, irrColor } from "~/lib/utils";
import { RiskDot, NumberField, DateField, TextField, Label } from "~/components/drawers/form-fields";
import {
  EquityDeploymentChart,
  buildDirectJCurve,
} from "~/components/charts/EquityDeploymentChart";
import { PerformanceIndicator } from "~/components/charts/PerformanceIndicator";

function Metric({ label, value, sub, valueClass }: { label: string; value: string; sub?: string; valueClass?: string }) {
  return (
    <div className="bg-atlas-surface border border-atlas-border rounded-[10px] px-4 py-3">
      <div className="text-[10px] text-atlas-gray4 uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-[15px] font-bold font-mono ${valueClass || "text-atlas-white"}`}>{value}</div>
      {sub && <div className="text-[10px] text-atlas-gray3 mt-0.5">{sub}</div>}
    </div>
  );
}

export default function DirectDetail() {
  const { id } = useParams();
  // Funds (for portfolio/asset-class denominators) come from the shared store.
  const { funds, directInvestments, getDirect, addValuation, logAudit, documents } = useClientData();
  const { openDocObject } = useDocViewer();
  const { entities } = useEntity();
  const { toast } = useToast();
  const cn = useCan();
  const guard = useGuard();
  const t = useT();
  const tdir = t.directs;

  const d = getDirect(id || "");

  // Manual valuation form
  const [valOpen, setValOpen] = useState(false);
  const [newVal, setNewVal] = useState("");
  const [newDate, setNewDate] = useState("2026-06-03");
  const [newNote, setNewNote] = useState("");
  // Session document list (per-company attachments)
  const [docs, setDocs] = useState<{ name: string; type: string; date: string }[]>([]);
  const [docName, setDocName] = useState("");

  // Denominators for % allocations
  const totals = useMemo(() => {
    const fundNav = funds.reduce((s, f) => s + (f.nav || 0), 0);
    const directVal = directInvestments.reduce((s, x) => s + (x.valuation || 0), 0);
    const portfolio = fundNav + directVal;
    const sameClass = directInvestments
      .filter((x) => x.asset_class === d?.asset_class)
      .reduce((s, x) => s + x.valuation, 0);
    return { portfolio, alternatives: portfolio, assetClass: sameClass };
  }, [funds, directInvestments, d]);

  if (!d) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-[14px] font-semibold text-atlas-white mb-2">—</div>
          <Link to="/directs" className="text-atlas-purple text-[12px] underline">{tdir.back}</Link>
        </div>
      </div>
    );
  }

  const moic = d.cost > 0 ? d.valuation / d.cost : 0;
  const dpi = d.cost > 0 ? (d.distributions || 0) / d.cost : 0;
  const pct = (part: number, whole: number) => (whole > 0 ? (part / whole) * 100 : 0);
  const entity = entities.find((e) => e.id === d.entity_id);
  const jcurve = buildDirectJCurve(d);

  const submitValuation = () => {
    const v = Number(newVal);
    if (!newVal || Number.isNaN(v) || v < 0) {
      toast(t.drawers.invalidNumber, "warning");
      return;
    }
    guard("valuation.update", () => {
      const old = d.valuation;
      addValuation(d.id, { date: newDate, value: v, note: newNote || undefined });
      logAudit({
        action: "valuation-update",
        entity: d.name,
        field: "valuation",
        old_value: formatCurrency(old),
        new_value: formatCurrency(v),
        screen: "Direct Investment Detail",
      });
      toast(tdir.valuationAdded, "success");
      setValOpen(false);
      setNewVal("");
      setNewNote("");
    });
  };

  const attachDoc = () => {
    if (!docName.trim()) return;
    guard("document.upload", () => {
      const doc = { name: docName.trim(), type: "Document", date: "2026-06-03" };
      setDocs((p) => [doc, ...p]);
      logAudit({ action: "create", entity: d.name, field: "document", new_value: doc.name, screen: "Direct Investment Detail" });
      toast(`${tdir.documents}: ${doc.name}`, "success");
      setDocName("");
    });
  };

  return (
    <div className="flex-1 overflow-y-auto p-7 flex flex-col gap-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <Link to="/directs" className="text-[11px] text-atlas-gray3 hover:text-atlas-purple no-underline">← {tdir.back}</Link>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="text-[22px] font-bold text-atlas-white font-display">{d.name}</h1>
            <RiskDot value={d.risk_rating} size={14} />
          </div>
          <p className="text-[12px] text-atlas-gray3 mt-0.5">
            {d.sector} · {d.asset_class} · {d.stage} · {d.geography} · {entity?.short || "—"}
          </p>
        </div>
        {cn("valuation.update") && (
          <button
            onClick={() => setValOpen((v) => !v)}
            className="px-[16px] py-[9px] rounded-lg border-none bg-atlas-purple text-atlas-white text-[13px] cursor-pointer font-semibold hover:opacity-90 transition-opacity"
          >
            {tdir.manualValuation}
          </button>
        )}
      </div>

      {/* Manual valuation form */}
      {valOpen && cn("valuation.update") && (
        <div className="bg-atlas-card border border-atlas-purple/40 rounded-[14px] p-5">
          <div className="text-[13px] font-bold text-atlas-white font-display mb-3">{tdir.manualValuation}</div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>{tdir.newValue}</Label><NumberField value={newVal} onChange={setNewVal} /></div>
            <div><Label>{tdir.valuationDate}</Label><DateField value={newDate} onChange={setNewDate} /></div>
            <div><Label>{tdir.note}</Label><TextField value={newNote} onChange={setNewNote} maxLength={120} /></div>
          </div>
          <div className="mt-2 flex items-center gap-4">
            <button onClick={submitValuation} className="px-4 py-2 rounded-lg bg-atlas-purple text-atlas-white text-[12px] font-semibold cursor-pointer border-none">
              {tdir.saveValuation}
            </button>
            <HelpFootnote tutorial="update-valuation" />
          </div>
        </div>
      )}

      {/* Summary card */}
      <div>
        <div className="text-[12px] font-bold text-atlas-white font-display mb-3">{tdir.summary}</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Metric label={tdir.commitment} value={formatCurrency(d.cost)} sub={d.currency} />
          <Metric label={tdir.capitalCalled} value={formatCurrency(d.cost)} sub="100% called" />
          <Metric label={tdir.latestValuation} value={formatCurrency(d.valuation)} sub={`${tdir.asOf} ${d.valuation_date}`} />
          <Metric label={tdir.distributions} value={formatCurrency(d.distributions || 0)} sub={`DPI ${dpi.toFixed(2)}x`} />
          <Metric label={tdir.ownership} value={`${d.ownership_pct.toFixed(1)}%`} />
          <Metric label={tdir.pctPortfolio} value={`${pct(d.valuation, totals.portfolio).toFixed(1)}%`} />
          <Metric label={tdir.pctAlternatives} value={`${pct(d.valuation, totals.alternatives).toFixed(1)}%`} />
          <Metric label={tdir.pctAssetClass} value={`${pct(d.valuation, totals.assetClass).toFixed(1)}%`} />
          <Metric
            label={tdir.netIrr}
            value={formatIrr(d.net_irr || 0)}
            valueClass={irrColor(d.net_irr || 0)}
            sub={`${tdir.asOf} ${d.valuation_date}`}
          />
          <Metric label={tdir.netMoic} value={formatMultiplier(moic)} valueClass="text-atlas-purple-light" sub={`${tdir.asOf} ${d.valuation_date}`} />
          <div className="bg-atlas-surface border border-atlas-border rounded-[10px] px-4 py-3 flex flex-col justify-center">
            <div className="text-[10px] text-atlas-gray4 uppercase tracking-wider mb-1.5">{tdir.riskRating}</div>
            <div className="flex items-center gap-2"><RiskDot value={d.risk_rating} size={14} /><span className="text-[12px] text-atlas-gray2 capitalize">{d.risk_rating}</span></div>
          </div>
        </div>
      </div>

      {/* Performance indicator */}
      <PerformanceIndicator
        riskRating={d.risk_rating}
        netIrr={d.net_irr || 0}
        valuations={d.valuation_history.map((v) => v.value)}
      />

      {/* J-curve */}
      <div className="bg-atlas-card border border-atlas-border rounded-[14px] p-5">
        <div className="flex items-center justify-between mb-1">
          <div className="text-[12px] font-bold text-atlas-white font-display">{tdir.jCurve}</div>
          <div className="flex items-center gap-3 text-[10px] text-atlas-gray3">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--color-atlas-red)" }} />{tdir.commitment}</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: "var(--color-atlas-green)" }} />NAV</span>
          </div>
        </div>
        <div className="text-[10px] text-atlas-gray4 mb-2">{tdir.deploymentLegend}</div>
        <EquityDeploymentChart data={jcurve} />
      </div>

      {/* Valuation history + Documents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-atlas-card border border-atlas-border rounded-[14px] p-5">
          <div className="text-[12px] font-bold text-atlas-white font-display mb-3">{tdir.valuationHistory}</div>
          <table className="w-full border-collapse">
            <tbody>
              {[...d.valuation_history].reverse().map((v, i) => (
                <tr key={i} className="border-t border-atlas-border first:border-t-0">
                  <td className="py-2 text-[11.5px] text-atlas-gray3 font-mono">{v.date}</td>
                  <td className="py-2 text-[12px] text-atlas-white font-mono font-semibold text-right">{formatCurrency(v.value)}</td>
                  <td className="py-2 text-[10.5px] text-atlas-gray4 pl-3">{v.note || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-atlas-card border border-atlas-border rounded-[14px] p-5">
          <div className="text-[12px] font-bold text-atlas-white font-display mb-1">{tdir.documents}</div>
          <div className="text-[10px] text-atlas-gray4 mb-3">{tdir.docsHint}</div>
          {cn("document.upload") && (
            <div className="flex gap-2 mb-3">
              <input
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                placeholder="e.g. Q1-2026 Board Deck.pdf"
                className="flex-1 bg-atlas-surface border border-atlas-border rounded-[7px] px-3 py-2 text-[12px] text-atlas-off-white outline-none focus:border-atlas-purple"
              />
              <button onClick={attachDoc} className="px-3 py-2 rounded-lg bg-atlas-purple text-atlas-white text-[12px] font-semibold cursor-pointer border-none">
                {tdir.uploadDoc}
              </button>
            </div>
          )}
          {(() => {
            const attached = documents.filter((doc) => doc.direct_id === d.id);
            if (attached.length === 0 && docs.length === 0) {
              return <div className="text-[11px] text-atlas-gray4">{tdir.noDocs}</div>;
            }
            return (
              <table className="w-full border-collapse">
                <tbody>
                  {attached.map((doc) => (
                    <tr
                      key={doc.id}
                      onClick={() => openDocObject(doc)}
                      className="border-t border-atlas-border first:border-t-0 cursor-pointer hover:bg-atlas-card-hover transition-colors"
                    >
                      <td className="py-2 text-[12px] text-atlas-white">
                        {doc.name}
                        <span className="text-[10px] text-atlas-gray4 ml-2">{doc.doc_type}</span>
                      </td>
                      <td className="py-2 text-[10.5px] text-atlas-gray4 text-right font-mono">{doc.date}</td>
                    </tr>
                  ))}
                  {docs.map((doc, i) => (
                    <tr key={`local-${i}`} className="border-t border-atlas-border first:border-t-0">
                      <td className="py-2 text-[12px] text-atlas-white">{doc.name}</td>
                      <td className="py-2 text-[10.5px] text-atlas-gray4 text-right font-mono">{doc.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
