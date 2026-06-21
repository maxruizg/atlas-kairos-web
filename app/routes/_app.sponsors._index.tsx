import { useState, useMemo } from "react";
import { Link } from "react-router";
import { useMergedSponsors } from "~/lib/use-merged-data";
import { formatCurrency, formatMultiplier, formatIrr, irrColor } from "~/lib/utils";
import { SponsorBadge } from "~/components/ui/SponsorBadge";
import { AddSponsorDrawer } from "~/components/drawers/AddSponsorDrawer";
import { AddFundDrawer } from "~/components/drawers/AddFundDrawer";
import { InvestmentCounter } from "~/components/ui/InvestmentCounter";
import { useClientData } from "~/lib/client-data-context";
import { useCan } from "~/lib/use-permissions";
import { useT } from "~/lib/use-t";

export default function SponsorsIndex() {
  // Sponsors come from the shared store (Supabase-backed) with aggregates
  // derived from the same funds the Portfolio Overview sums (QA #3).
  const sponsors = useMergedSponsors();
  const { directInvestments, taxonomy } = useClientData();
  const cn = useCan();
  const [search, setSearch] = useState("");
  const [filterAsset, setFilterAsset] = useState<string>("All");
  const [filterGeo, setFilterGeo] = useState<string>("All");
  const [showAddSponsor, setShowAddSponsor] = useState(false);
  const [showAddFund, setShowAddFund] = useState(false);
  const t = useT();

  // Asset-class filter from the single taxonomy source of truth (QA #5), unioned
  // with any class already on a sponsor so nothing is ever unfilterable.
  const allAssets = useMemo(() => {
    const set = new Set<string>(taxonomy.assetClasses);
    for (const s of sponsors) for (const a of s.asset_classes) set.add(a);
    return ["All", ...Array.from(set)];
  }, [sponsors, taxonomy.assetClasses]);

  const filtered = useMemo(() => {
    return sponsors.filter((s) => {
      if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterAsset !== "All" && !s.asset_classes.includes(filterAsset)) return false;
      return true;
    });
  }, [sponsors, search, filterAsset, filterGeo]);

  return (
    <div className="flex-1 overflow-y-auto p-7 flex flex-col gap-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-[22px] font-bold text-atlas-white font-display">{t.sponsors.title}</h1>
          <p className="text-[13px] text-atlas-gray3 mt-0.5">
            {t.sponsors.subtitle(sponsors.length, sponsors.reduce((s, sp) => s + sp.fund_count, 0))}
          </p>
          <div className="mt-2">
            <InvestmentCounter
              fundCount={sponsors.reduce((s, sp) => s + sp.fund_count, 0)}
              directCount={directInvestments.length}
            />
          </div>
        </div>
        {cn("fund.add") && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddFund(true)}
              className="px-3.5 py-[7px] rounded-lg border border-atlas-border bg-transparent text-atlas-gray2 text-xs cursor-pointer font-semibold hover:border-atlas-gray4 transition-colors"
            >
              + {t.drawers.addFund}
            </button>
            <button
              onClick={() => setShowAddSponsor(true)}
              className="px-3.5 py-[7px] rounded-lg border-none bg-atlas-purple text-atlas-white text-xs cursor-pointer font-semibold"
            >
              + {t.drawers.addSponsor}
            </button>
          </div>
        )}
      </div>

      {/* Search + Filters */}
      <div className="flex gap-3 items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t.sponsors.searchPlaceholder}
          className="bg-atlas-card border border-atlas-border rounded-lg px-3 py-2 text-sm text-atlas-white outline-none placeholder:text-atlas-gray4 focus:border-atlas-purple transition-colors w-64"
        />
        <select
          value={filterAsset}
          onChange={(e) => setFilterAsset(e.target.value)}
          className="bg-atlas-card border border-atlas-border rounded-lg px-3 py-2 text-sm text-atlas-white appearance-none cursor-pointer"
        >
          {allAssets.map((a) => (
            <option key={a} value={a}>
              {a === "All" ? t.sponsors.allAssetClasses : a}
            </option>
          ))}
        </select>
      </div>

      {/* Sponsor Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((s) => (
          <Link
            key={s.id}
            to={`/sponsors/${s.id}`}
            className="bg-atlas-card border border-atlas-border rounded-[14px] p-5 hover:border-atlas-border-bright transition-colors no-underline group"
          >
            <div className="flex items-center gap-3 mb-4">
              <SponsorBadge initials={s.initials} color={s.color} size="md" />
              <div>
                <div className="text-[14px] font-semibold text-atlas-white group-hover:text-atlas-purple-light transition-colors">
                  {s.name}
                </div>
                <div className="text-[11px] text-atlas-gray3">{s.country}</div>
              </div>
            </div>
            <div className="flex gap-1 mb-3">
              {s.asset_classes.map((ac) => (
                <span
                  key={ac}
                  className="text-[9px] px-2 py-0.5 rounded bg-atlas-purple-dim text-atlas-purple-light font-semibold"
                >
                  {ac}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <div className="text-[9px] text-atlas-gray3 uppercase tracking-widest mb-0.5">{t.sponsors.funds}</div>
                <div className="text-sm font-bold text-atlas-white font-mono">{s.fund_count}</div>
              </div>
              <div>
                <div className="text-[9px] text-atlas-gray3 uppercase tracking-widest mb-0.5">{t.sponsors.totalNav}</div>
                <div className="text-sm font-bold text-atlas-white font-mono">{formatCurrency(s.total_nav)}</div>
              </div>
              <div>
                <div className="text-[9px] text-atlas-gray3 uppercase tracking-widest mb-0.5">{t.sponsors.tvpi}</div>
                <div className="text-sm font-bold text-atlas-purple font-mono">{formatMultiplier(s.tvpi)}</div>
              </div>
              <div>
                <div className="text-[9px] text-atlas-gray3 uppercase tracking-widest mb-0.5">{t.sponsors.netIrr}</div>
                <div
                  className={`text-sm font-bold font-mono ${irrColor(s.net_irr)}`}
                  title={formatIrr(s.net_irr, 4)}
                >
                  {formatIrr(s.net_irr)}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <AddSponsorDrawer open={showAddSponsor} onClose={() => setShowAddSponsor(false)} />
      <AddFundDrawer open={showAddFund} onClose={() => setShowAddFund(false)} />
    </div>
  );
}
