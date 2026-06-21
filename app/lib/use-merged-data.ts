import { useMemo } from "react";
import { useClientData } from "~/lib/client-data-context";
import type { Sponsor, Fund, PortfolioCompany } from "~/lib/types";

/**
 * Sponsors and funds are now loaded once in the `_app` loader and shared
 * through the store (Supabase-backed, with optimistic updates). These helpers
 * return that single store copy and ignore any per-route loader argument, so
 * every screen reads identical data and a newly-added sponsor/fund/direct
 * appears everywhere at once (QA #3). The optional `_loader*` params are kept
 * so existing call sites compile unchanged.
 */
export function useMergedSponsors(_loaderSponsors?: Sponsor[]): Sponsor[] {
  return useClientData().sponsors;
}

export function useMergedFunds(_loaderFunds?: Fund[]): Fund[] {
  return useClientData().funds;
}

export function useMergedCompanies(
  fundId: string,
  loaderCompanies: PortfolioCompany[] = []
): PortfolioCompany[] {
  const { companies } = useClientData();
  return useMemo(
    () => [...loaderCompanies, ...(companies[fundId] || [])],
    [loaderCompanies, companies, fundId]
  );
}
