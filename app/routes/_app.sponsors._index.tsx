import { useState, useMemo } from "react";
import { useLoaderData, Link } from "react-router";
import { api } from "~/lib/api.server";
import { getEntityFromRequest } from "~/lib/entity-context";
import type { Sponsor } from "~/lib/types";
import { formatCurrency, formatMultiplier, formatIrr, irrColor } from "~/lib/utils";
import { SponsorBadge } from "~/components/ui/SponsorBadge";

export async function loader({ request }: { request: Request }) {
  const entityId = getEntityFromRequest(request) || undefined;
  const sponsors = await api.getSponsors(entityId);
  return { sponsors };
}

export default function SponsorsIndex() {
  const { sponsors } = useLoaderData<{ sponsors: Sponsor[] }>();
  const [search, setSearch] = useState("");
  const [filterAsset, setFilterAsset] = useState<string>("All");
  const [filterGeo, setFilterGeo] = useState<string>("All");

  // Collect unique asset classes and geographies
  const allAssets = useMemo(() => {
    const set = new Set<string>();
    for (const s of sponsors) for (const a of s.asset_classes) set.add(a);
    return ["All", ...Array.from(set)];
  }, [sponsors]);

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
      <div>
        <h1 className="text-[22px] font-bold text-atlas-white font-display">Sponsors</h1>
        <p className="text-[13px] text-atlas-gray3 mt-0.5">
          {sponsors.length} sponsor relationships &middot; {sponsors.reduce((s, sp) => s + sp.fund_count, 0)} funds
        </p>
      </div>

      {/* Search + Filters */}
      <div className="flex gap-3 items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search sponsors\u2026"
          className="bg-atlas-card border border-atlas-border rounded-lg px-3 py-2 text-sm text-atlas-white outline-none placeholder:text-atlas-gray4 focus:border-atlas-purple transition-colors w-64"
        />
        <select
          value={filterAsset}
          onChange={(e) => setFilterAsset(e.target.value)}
          className="bg-atlas-card border border-atlas-border rounded-lg px-3 py-2 text-sm text-atlas-white appearance-none cursor-pointer"
        >
          {allAssets.map((a) => (
            <option key={a} value={a}>
              {a === "All" ? "All Asset Classes" : a}
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
                <div className="text-[9px] text-atlas-gray3 uppercase tracking-widest mb-0.5">Funds</div>
                <div className="text-sm font-bold text-atlas-white font-mono">{s.fund_count}</div>
              </div>
              <div>
                <div className="text-[9px] text-atlas-gray3 uppercase tracking-widest mb-0.5">Total NAV</div>
                <div className="text-sm font-bold text-atlas-white font-mono">{formatCurrency(s.total_nav)}</div>
              </div>
              <div>
                <div className="text-[9px] text-atlas-gray3 uppercase tracking-widest mb-0.5">TVPI</div>
                <div className="text-sm font-bold text-atlas-purple font-mono">{formatMultiplier(s.tvpi)}</div>
              </div>
              <div>
                <div className="text-[9px] text-atlas-gray3 uppercase tracking-widest mb-0.5">Net IRR</div>
                <div className={`text-sm font-bold font-mono ${irrColor(s.net_irr)}`}>
                  {formatIrr(s.net_irr)}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
