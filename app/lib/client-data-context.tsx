import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { useRevalidator } from "react-router";
import type {
  Sponsor,
  Fund,
  PortfolioCompany,
  DirectInvestment,
  ValuationEntry,
  TaxonomyLists,
  RoleId,
  TeamMember,
  AuditEntry,
  Entity,
  Document,
  ReviewField,
  GraphNodeMeta,
} from "~/lib/types";
import { DEFAULT_TAXONOMY } from "~/lib/taxonomy";
import { SEED_SPONSORS, buildSeedFunds } from "~/lib/seed";

/**
 * App-level store.
 *
 *  • funds / sponsors / companies — client-side merge layer on top of the
 *    api.server (Rust backend) data; seeded in-memory, reset on reload.
 *  • directInvestments / taxonomy / auditLog — persisted in Supabase. The
 *    `_app` loader fetches them and passes them in as props; mutations POST
 *    to `/api/data` and then revalidate so the loader refreshes them.
 */

const CURRENT_USER = "Owner";
const FIXED_ROLE: RoleId = "ceo";

const DEFAULT_TEAM: TeamMember[] = [
  { id: "u-owner", name: "Owner", email: "owner@familyoffice.mx", role: "ceo" },
  { id: "u-head", name: "Head of Portfolio", email: "head@familyoffice.mx", role: "head_portfolio" },
  { id: "u-senior", name: "Senior Analyst", email: "senior@familyoffice.mx", role: "senior_analyst" },
  { id: "u-analyst", name: "Analyst", email: "analyst@familyoffice.mx", role: "analyst" },
  { id: "u-lp", name: "LP Viewer", email: "lp@familyoffice.mx", role: "viewer" },
];

interface ClientData {
  sponsors: Sponsor[];
  funds: Fund[];
  companies: Record<string, PortfolioCompany[]>;
  directInvestments: DirectInvestment[];
  taxonomy: TaxonomyLists;
  team: TeamMember[];
  auditLog: AuditEntry[];
  documents: Document[];
  graphNodeMeta: GraphNodeMeta[];
  currentRole: RoleId;
  currentUser: string;

  // funds / sponsors / companies (client-side)
  addSponsor: (s: Sponsor) => void;
  addFund: (f: Fund) => void;
  updateFund: (id: string, patch: Partial<Fund>) => void;
  deleteFund: (id: string) => void;
  addCompany: (fundId: string, c: PortfolioCompany) => void;
  updateFundEntity: (fundId: string, newEntityId: string) => void;

  // direct investments (Supabase-backed)
  addDirect: (d: DirectInvestment) => void;
  updateDirect: (id: string, patch: Partial<DirectInvestment>) => void;
  deleteDirect: (id: string) => void;
  addValuation: (directId: string, entry: ValuationEntry) => void;
  getDirect: (id: string) => DirectInvestment | undefined;

  // taxonomy (Supabase-backed — persisted as the whole lists object)
  addTaxonomyItem: (list: keyof TaxonomyLists, value: string, assetClass?: string) => void;
  editTaxonomyItem: (list: keyof TaxonomyLists, oldValue: string, newValue: string, assetClass?: string) => void;
  deleteTaxonomyItem: (list: keyof TaxonomyLists, value: string, assetClass?: string) => void;

  // audit (Supabase-backed)
  logAudit: (e: Omit<AuditEntry, "id" | "timestamp" | "user">) => void;

  // documents (Supabase-backed)
  addDocument: (d: Document) => void;
  updateDocumentStatus: (id: string, status: string) => void;
  approveDocField: (id: string, fieldId: string, approved: boolean) => void;
  getDocument: (id: string) => Document | undefined;

  // segundo cerebro — graph node metadata (Supabase-backed, upsert)
  getGraphMeta: (nodeRefId: string, nodeType: GraphNodeMeta["node_type"]) => GraphNodeMeta | undefined;
  upsertGraphMeta: (meta: GraphNodeMeta) => void;
}

const ClientDataContext = createContext<ClientData | null>(null);

async function postData(payload: Record<string, unknown>): Promise<void> {
  await fetch("/api/data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function ClientDataProvider({
  entities,
  directInvestments: serverDirects,
  taxonomy: serverTaxonomy,
  auditLog: serverAudit,
  documents: serverDocuments,
  graphNodeMeta: serverGraphMeta,
  children,
}: {
  entities: Entity[];
  directInvestments: DirectInvestment[];
  taxonomy: TaxonomyLists;
  auditLog: AuditEntry[];
  documents: Document[];
  graphNodeMeta: GraphNodeMeta[];
  children: ReactNode;
}) {
  const revalidator = useRevalidator();

  // Client-side merge layer (in-memory, seeded once).
  const seededFunds = useMemo(() => buildSeedFunds(entities), [entities]);
  const [sponsors, setSponsors] = useState<Sponsor[]>(SEED_SPONSORS);
  const [funds, setFunds] = useState<Fund[]>(seededFunds);
  const [companies, setCompanies] = useState<Record<string, PortfolioCompany[]>>({});

  // Supabase-backed slices — initialise from loader props, keep a local
  // optimistic copy, and re-sync whenever the loader props change.
  const [directInvestments, setDirects] = useState<DirectInvestment[]>(serverDirects);
  const [taxonomy, setTaxonomy] = useState<TaxonomyLists>(serverTaxonomy ?? DEFAULT_TAXONOMY);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>(serverAudit);
  const [documents, setDocuments] = useState<Document[]>(serverDocuments);
  const [graphNodeMeta, setGraphMeta] = useState<GraphNodeMeta[]>(serverGraphMeta ?? []);
  const [team] = useState<TeamMember[]>(DEFAULT_TEAM);

  useEffect(() => { setDirects(serverDirects); }, [serverDirects]);
  useEffect(() => { setTaxonomy(serverTaxonomy ?? DEFAULT_TAXONOMY); }, [serverTaxonomy]);
  useEffect(() => { setAuditLog(serverAudit); }, [serverAudit]);
  useEffect(() => { setDocuments(serverDocuments); }, [serverDocuments]);
  useEffect(() => { setGraphMeta(serverGraphMeta ?? []); }, [serverGraphMeta]);

  const refresh = useCallback(() => revalidator.revalidate(), [revalidator]);

  // ── audit ────────────────────────────────────────────────────────────
  const logAudit = useCallback((e: Omit<AuditEntry, "id" | "timestamp" | "user">) => {
    const entry: AuditEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      user: CURRENT_USER,
      ...e,
    };
    setAuditLog((prev) => [entry, ...prev]); // optimistic
    postData({ intent: "create-audit", entry: { ...e, user: CURRENT_USER } });
  }, []);

  // ── funds / sponsors / companies (client-side) ─────────────────────────
  const addSponsor = useCallback((s: Sponsor) => setSponsors((p) => [...p, s]), []);
  const addFund = useCallback((f: Fund) => setFunds((p) => [...p, f]), []);
  const updateFund = useCallback(
    (id: string, patch: Partial<Fund>) => setFunds((p) => p.map((f) => (f.id === id ? { ...f, ...patch } : f))),
    []
  );
  const deleteFund = useCallback((id: string) => setFunds((p) => p.filter((f) => f.id !== id)), []);
  const addCompany = useCallback((fundId: string, c: PortfolioCompany) => {
    setCompanies((prev) => ({ ...prev, [fundId]: [...(prev[fundId] || []), c] }));
  }, []);
  const updateFundEntity = useCallback((fundId: string, newEntityId: string) => {
    setFunds((prev) => prev.map((f) => (f.id === fundId ? { ...f, entity_id: newEntityId } : f)));
  }, []);

  // ── direct investments (Supabase-backed) ───────────────────────────────
  const addDirect = useCallback((d: DirectInvestment) => {
    setDirects((p) => [...p, d]); // optimistic
    postData({ intent: "create-direct", direct: d }).then(() => refresh());
  }, [refresh]);

  const updateDirect = useCallback((id: string, patch: Partial<DirectInvestment>) => {
    setDirects((p) => p.map((d) => (d.id === id ? { ...d, ...patch } : d)));
    postData({ intent: "update-direct", id, patch }).then(() => refresh());
  }, [refresh]);

  const deleteDirect = useCallback((id: string) => {
    setDirects((p) => p.filter((d) => d.id !== id));
    postData({ intent: "delete-direct", id }).then(() => refresh());
  }, [refresh]);

  const addValuation = useCallback((directId: string, entry: ValuationEntry) => {
    setDirects((prev) =>
      prev.map((d) => {
        if (d.id !== directId) return d;
        const history = [...d.valuation_history, entry].sort((a, b) => a.date.localeCompare(b.date));
        const latest = history[history.length - 1];
        return {
          ...d,
          valuation_history: history,
          valuation: latest.value,
          valuation_date: latest.date,
          nav_history: history.map((h) => ({ q: h.date.slice(0, 4), nav: h.value })),
        };
      })
    );
    postData({ intent: "add-valuation", id: directId, entry }).then(() => refresh());
  }, [refresh]);

  const getDirect = useCallback(
    (id: string) => directInvestments.find((d) => d.id === id),
    [directInvestments]
  );

  // ── taxonomy (Supabase-backed; persist the whole lists object) ─────────
  const persistTaxonomy = useCallback((next: TaxonomyLists) => {
    setTaxonomy(next); // optimistic
    postData({ intent: "put-taxonomy", lists: next }).then(() => refresh());
  }, [refresh]);

  const addTaxonomyItem = useCallback((list: keyof TaxonomyLists, value: string, assetClass?: string) => {
    setTaxonomy((prev) => {
      let next = prev;
      if (list === "strategies" && assetClass) {
        const cur = prev.strategies[assetClass] || [];
        if (!cur.includes(value)) next = { ...prev, strategies: { ...prev.strategies, [assetClass]: [...cur, value] } };
      } else {
        const arr = prev[list];
        if (Array.isArray(arr) && !(arr as string[]).includes(value)) {
          next = { ...prev, [list]: [...(arr as string[]), value] } as TaxonomyLists;
        }
      }
      if (next !== prev) postData({ intent: "put-taxonomy", lists: next }).then(() => refresh());
      return next;
    });
  }, [refresh]);

  const editTaxonomyItem = useCallback(
    (list: keyof TaxonomyLists, oldValue: string, newValue: string, assetClass?: string) => {
      setTaxonomy((prev) => {
        let next = prev;
        if (list === "strategies" && assetClass) {
          const cur = prev.strategies[assetClass] || [];
          next = { ...prev, strategies: { ...prev.strategies, [assetClass]: cur.map((v) => (v === oldValue ? newValue : v)) } };
        } else if (Array.isArray(prev[list])) {
          next = { ...prev, [list]: (prev[list] as string[]).map((v) => (v === oldValue ? newValue : v)) } as TaxonomyLists;
        }
        if (next !== prev) postData({ intent: "put-taxonomy", lists: next }).then(() => refresh());
        return next;
      });
    },
    [refresh]
  );

  const deleteTaxonomyItem = useCallback(
    (list: keyof TaxonomyLists, value: string, assetClass?: string) => {
      setTaxonomy((prev) => {
        let next = prev;
        if (list === "strategies" && assetClass) {
          const cur = prev.strategies[assetClass] || [];
          next = { ...prev, strategies: { ...prev.strategies, [assetClass]: cur.filter((v) => v !== value) } };
        } else if (Array.isArray(prev[list])) {
          next = { ...prev, [list]: (prev[list] as string[]).filter((v) => v !== value) } as TaxonomyLists;
        }
        if (next !== prev) postData({ intent: "put-taxonomy", lists: next }).then(() => refresh());
        return next;
      });
    },
    [refresh]
  );

  // persistTaxonomy retained for potential bulk use
  void persistTaxonomy;

  // ── documents (Supabase-backed) ────────────────────────────────────────
  const addDocument = useCallback((d: Document) => {
    setDocuments((p) => [d, ...p]); // optimistic
    postData({ intent: "create-document", document: d }).then(() => refresh());
  }, [refresh]);

  const updateDocumentStatus = useCallback((id: string, status: string) => {
    setDocuments((p) => p.map((d) => (d.id === id ? { ...d, status } : d)));
    postData({ intent: "update-document-status", id, status }).then(() => refresh());
  }, [refresh]);

  const approveDocField = useCallback((id: string, fieldId: string, approved: boolean) => {
    setDocuments((prev) =>
      prev.map((d) => {
        if (d.id !== id) return d;
        const fields: ReviewField[] = (d.extracted_fields || []).map((f) =>
          f.id === fieldId ? { ...f, approved } : f
        );
        const extracted = fields.filter((f) => f.approved !== null).length;
        return { ...d, extracted_fields: fields, extracted };
      })
    );
    postData({ intent: "approve-doc-field", id, fieldId, approved }).then(() => refresh());
  }, [refresh]);

  const getDocument = useCallback(
    (id: string) => documents.find((d) => d.id === id),
    [documents]
  );

  // ── segundo cerebro graph metadata (Supabase-backed upsert) ────────────
  const getGraphMeta = useCallback(
    (nodeRefId: string, nodeType: GraphNodeMeta["node_type"]) =>
      graphNodeMeta.find((m) => m.node_ref_id === nodeRefId && m.node_type === nodeType),
    [graphNodeMeta]
  );

  const upsertGraphMeta = useCallback((meta: GraphNodeMeta) => {
    setGraphMeta((prev) => {
      const idx = prev.findIndex(
        (m) => m.node_ref_id === meta.node_ref_id && m.node_type === meta.node_type
      );
      return idx >= 0
        ? [...prev.slice(0, idx), { ...prev[idx], ...meta }, ...prev.slice(idx + 1)]
        : [...prev, meta];
    });
    postData({ intent: "upsert-graph-meta", meta }).then(() => refresh());
  }, [refresh]);

  const value: ClientData = {
    sponsors, funds, companies, directInvestments, taxonomy, team, auditLog, documents,
    graphNodeMeta,
    currentRole: FIXED_ROLE, currentUser: CURRENT_USER,
    addSponsor, addFund, updateFund, deleteFund, addCompany, updateFundEntity,
    addDirect, updateDirect, deleteDirect, addValuation, getDirect,
    addTaxonomyItem, editTaxonomyItem, deleteTaxonomyItem, logAudit,
    addDocument, updateDocumentStatus, approveDocField, getDocument,
    getGraphMeta, upsertGraphMeta,
  };

  return <ClientDataContext.Provider value={value}>{children}</ClientDataContext.Provider>;
}

export function useClientData(): ClientData {
  const ctx = useContext(ClientDataContext);
  if (!ctx) throw new Error("useClientData must be used within ClientDataProvider");
  return ctx;
}

export { useClientData as useAppStore };
