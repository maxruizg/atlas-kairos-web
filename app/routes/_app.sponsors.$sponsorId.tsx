import { useLoaderData, Link } from "react-router";
import { api } from "~/lib/api.server";
import { getEntityFromRequest } from "~/lib/entity-context";
import type { Sponsor, Fund } from "~/lib/types";
import { formatCurrency, formatMultiplier, formatIrr, irrColor } from "~/lib/utils";
import { SponsorBadge } from "~/components/ui/SponsorBadge";
import { useT } from "~/lib/use-t";

export async function loader({ request, params }: { request: Request; params: { sponsorId: string } }) {
  const entityId = getEntityFromRequest(request) || undefined;
  const [sponsor, funds] = await Promise.all([
    api.getSponsor(params.sponsorId),
    api.getFunds(entityId, params.sponsorId),
  ]);
  return { sponsor, funds };
}

export default function SponsorDetail() {
  const { sponsor, funds } = useLoaderData<{
    sponsor: Sponsor;
    funds: Fund[];
  }>();
  const t = useT();
  const sd = t.sponsorDetail;

  const totalCompanies = funds.reduce((s, f) => s + f.companies.length, 0);

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

      {/* Fund Cards */}
      <div className="text-sm font-semibold text-atlas-white">{sd.fundsTitle}</div>
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
                <div
                  className={`text-sm font-bold font-mono ${irrColor(f.net_irr)}`}
                  title={formatIrr(f.net_irr, 4)}
                >
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
                    <div
                      className="h-full bg-atlas-purple rounded-sm"
                      style={{ width: `${f.pct_called}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
