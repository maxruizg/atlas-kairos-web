import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { Sponsor, Fund, PortfolioCompany } from "~/lib/types";

interface ClientData {
  sponsors: Sponsor[];
  funds: Fund[];
  companies: Record<string, PortfolioCompany[]>;
  addSponsor: (s: Sponsor) => void;
  addFund: (f: Fund) => void;
  addCompany: (fundId: string, c: PortfolioCompany) => void;
  updateFundEntity: (fundId: string, newEntityId: string) => void;
}

const ClientDataContext = createContext<ClientData | null>(null);

export function ClientDataProvider({ children }: { children: ReactNode }) {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [companies, setCompanies] = useState<Record<string, PortfolioCompany[]>>({});

  const addSponsor = useCallback((s: Sponsor) => {
    setSponsors((prev) => [...prev, s]);
  }, []);

  const addFund = useCallback((f: Fund) => {
    setFunds((prev) => [...prev, f]);
  }, []);

  const addCompany = useCallback((fundId: string, c: PortfolioCompany) => {
    setCompanies((prev) => ({
      ...prev,
      [fundId]: [...(prev[fundId] || []), c],
    }));
  }, []);

  const updateFundEntity = useCallback((fundId: string, newEntityId: string) => {
    setFunds((prev) =>
      prev.map((f) => (f.id === fundId ? { ...f, entity_id: newEntityId } : f))
    );
  }, []);

  return (
    <ClientDataContext.Provider
      value={{ sponsors, funds, companies, addSponsor, addFund, addCompany, updateFundEntity }}
    >
      {children}
    </ClientDataContext.Provider>
  );
}

export function useClientData(): ClientData {
  const ctx = useContext(ClientDataContext);
  if (!ctx) throw new Error("useClientData must be used within ClientDataProvider");
  return ctx;
}
