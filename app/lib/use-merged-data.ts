import { useMemo } from "react";
import { useClientData } from "~/lib/client-data-context";
import type { Sponsor, Fund, PortfolioCompany } from "~/lib/types";

export function useMergedSponsors(loaderSponsors: Sponsor[]): Sponsor[] {
  const { sponsors: clientSponsors } = useClientData();
  return useMemo(
    () => [...loaderSponsors, ...clientSponsors],
    [loaderSponsors, clientSponsors]
  );
}

export function useMergedFunds(loaderFunds: Fund[]): Fund[] {
  const { funds: clientFunds } = useClientData();
  return useMemo(
    () => [...loaderFunds, ...clientFunds],
    [loaderFunds, clientFunds]
  );
}

export function useMergedCompanies(
  fundId: string,
  loaderCompanies: PortfolioCompany[]
): PortfolioCompany[] {
  const { companies } = useClientData();
  return useMemo(
    () => [...loaderCompanies, ...(companies[fundId] || [])],
    [loaderCompanies, companies, fundId]
  );
}
