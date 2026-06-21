import type { Sponsor, Fund, DirectInvestment } from "~/lib/types";

/**
 * Portfolio rollup helpers — the single place sponsor/portfolio aggregates are
 * derived from the underlying funds. Previously the Sponsors page read static
 * `fund_count`/NAV fields off the sponsor object while the Portfolio Overview
 * summed live funds, so the two disagreed (QA #3). Both now flow through these
 * pure functions over the same `funds` array, so they can never drift.
 *
 * Client-safe (no `.server` imports) so optimistic client-added sponsors/funds
 * recompute identically to the loader.
 */

type SponsorSeed = Pick<
  Sponsor,
  "id" | "name" | "initials" | "country" | "color" | "asset_classes"
>;

/** Fill a sponsor's derived metrics from its funds. Asset classes are the union
 *  of what was explicitly saved on the sponsor and what its funds imply. */
export function computeSponsorAggregates<T extends SponsorSeed>(
  sponsors: T[],
  funds: Fund[]
): Sponsor[] {
  return sponsors.map((s) => {
    const own = funds.filter((f) => f.sponsor_id === s.id);
    const totalNav = own.reduce((a, f) => a + (f.nav || 0), 0);
    const totalCommitment = own.reduce((a, f) => a + (f.commitment || 0), 0);
    const totalPaidIn = own.reduce((a, f) => a + (f.paid_in || 0), 0);
    const totalDist = own.reduce((a, f) => a + (f.distributions || 0), 0);

    // TVPI = (NAV + cumulative distributions) / paid-in.
    const tvpi = totalPaidIn > 0 ? (totalNav + totalDist) / totalPaidIn : 0;
    // Net IRR weighted by paid-in capital (matches the dashboard's weighting).
    const netIrr =
      totalPaidIn > 0
        ? own.reduce((a, f) => a + (f.net_irr || 0) * (f.paid_in || 0), 0) / totalPaidIn
        : 0;
    const companyCount = own.reduce((a, f) => a + (f.companies?.length || 0), 0);

    const classes = new Set<string>(s.asset_classes || []);
    for (const f of own) if (f.asset_class) classes.add(f.asset_class);

    return {
      ...s,
      asset_classes: Array.from(classes),
      fund_count: own.length,
      total_nav: totalNav,
      total_commitment: totalCommitment,
      tvpi,
      net_irr: netIrr,
      company_count: companyCount,
    };
  });
}

export interface PortfolioTotals {
  fundCount: number;
  directCount: number;
  /** Combined NAV of funds + direct investments. */
  totalNav: number;
  totalPaidIn: number;
  totalCommitment: number;
  totalDistributions: number;
  totalUnfunded: number;
}

/** Portfolio-wide totals across funds and direct investments. */
export function computePortfolioTotals(
  funds: Fund[],
  directs: DirectInvestment[]
): PortfolioTotals {
  const fundNav = funds.reduce((a, f) => a + (f.nav || 0), 0);
  const directNav = directs.reduce((a, d) => a + (d.valuation || 0), 0);
  return {
    fundCount: funds.length,
    directCount: directs.length,
    totalNav: fundNav + directNav,
    totalPaidIn:
      funds.reduce((a, f) => a + (f.paid_in || 0), 0) +
      directs.reduce((a, d) => a + (d.cost || 0), 0),
    totalCommitment: funds.reduce((a, f) => a + (f.commitment || 0), 0),
    totalDistributions:
      funds.reduce((a, f) => a + (f.distributions || 0), 0) +
      directs.reduce((a, d) => a + (d.distributions || 0), 0),
    totalUnfunded: funds.reduce((a, f) => a + (f.unfunded || 0), 0),
  };
}
