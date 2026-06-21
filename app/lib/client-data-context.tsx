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
  SponsorBase,
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
import { computeSponsorAggregates } from "~/lib/portfolio";
import { useToast } from "~/lib/toast-context";
import { useLang } from "~/lib/lang-context";
import { fetchWithRetry } from "~/lib/retry";

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

interface PostResult {
  ok: boolean;
  error?: string;
  data?: any;
}

/** POST a mutation to `/api/data` with backoff retry. Never throws — returns a
 *  result so callers can revert optimistic state + surface a toast on failure. */
async function postData(payload: Record<string, unknown>): Promise<PostResult> {
  try {
    const res = await fetchWithRetry("/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({} as any));
    if (!res.ok || json?.ok === false) {
      return { ok: false, error: json?.error || `Request failed (${res.status})` };
    }
    return { ok: true, data: json };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export function ClientDataProvider({
  entities,
  sponsors: serverSponsors,
  funds: serverFunds,
  directInvestments: serverDirects,
  taxonomy: serverTaxonomy,
  auditLog: serverAudit,
  documents: serverDocuments,
  graphNodeMeta: serverGraphMeta,
  children,
}: {
  entities: Entity[];
  sponsors: SponsorBase[];
  funds: Fund[];
  directInvestments: DirectInvestment[];
  taxonomy: TaxonomyLists;
  auditLog: AuditEntry[];
  documents: Document[];
  graphNodeMeta: GraphNodeMeta[];
  children: ReactNode;
}) {
  void entities; // entities are consumed by EntityProvider, not the store.
  const revalidator = useRevalidator();

  // Supabase-backed slices — initialise from loader props, keep a local
  // optimistic copy, and re-sync whenever the loader props change (so a failed
  // optimistic write reverts and a successful one is confirmed by the row).
  const [sponsorsBase, setSponsors] = useState<SponsorBase[]>(serverSponsors);
  const [funds, setFunds] = useState<Fund[]>(serverFunds);
  const [companies, setCompanies] = useState<Record<string, PortfolioCompany[]>>({});
  const [directInvestments, setDirects] = useState<DirectInvestment[]>(serverDirects);
  const [taxonomy, setTaxonomy] = useState<TaxonomyLists>(serverTaxonomy ?? DEFAULT_TAXONOMY);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>(serverAudit);
  const [documents, setDocuments] = useState<Document[]>(serverDocuments);
  const [graphNodeMeta, setGraphMeta] = useState<GraphNodeMeta[]>(serverGraphMeta ?? []);
  const [team] = useState<TeamMember[]>(DEFAULT_TEAM);

  useEffect(() => { setSponsors(serverSponsors); }, [serverSponsors]);
  useEffect(() => { setFunds(serverFunds); }, [serverFunds]);
  useEffect(() => { setDirects(serverDirects); }, [serverDirects]);
  useEffect(() => { setTaxonomy(serverTaxonomy ?? DEFAULT_TAXONOMY); }, [serverTaxonomy]);
  useEffect(() => { setAuditLog(serverAudit); }, [serverAudit]);
  useEffect(() => { setDocuments(serverDocuments); }, [serverDocuments]);
  useEffect(() => { setGraphMeta(serverGraphMeta ?? []); }, [serverGraphMeta]);

  // Sponsors expose aggregates DERIVED from the live funds, so the Sponsors
  // page and the Portfolio Overview can never drift apart (QA #3).
  const sponsors = useMemo(
    () => computeSponsorAggregates(sponsorsBase, funds),
    [sponsorsBase, funds]
  );

  const refresh = useCallback(() => revalidator.revalidate(), [revalidator]);
  const { toast } = useToast();
  const { lang } = useLang();

  /**
   * Persist a mutation. Always re-syncs to server truth afterwards (so a failed
   * optimistic update reverts on the next loader revalidation) and surfaces a
   * toast on failure — no more silent saves. Pass `silent` for low-value writes
   * (e.g. the audit log) that shouldn't nag the user if they blip.
   */
  const persist = useCallback(
    async (payload: Record<string, unknown>, opts?: { silent?: boolean }): Promise<PostResult> => {
      const r = await postData(payload);
      if (!r.ok && !opts?.silent) {
        const detail = r.error ? ` (${r.error})` : "";
        toast(
          lang === "es" ? `No se pudo guardar${detail}` : `Couldn't save${detail}`,
          "error"
        );
      }
      refresh();
      return r;
    },
    [refresh, toast, lang]
  );

  // ── audit ────────────────────────────────────────────────────────────
  const logAudit = useCallback((e: Omit<AuditEntry, "id" | "timestamp" | "user">) => {
    const entry: AuditEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      user: CURRENT_USER,
      ...e,
    };
    setAuditLog((prev) => [entry, ...prev]); // optimistic
    persist({ intent: "create-audit", entry: { ...e, user: CURRENT_USER } }, { silent: true });
  }, [persist]);

  // ── funds / sponsors / companies (Supabase-backed) ─────────────────────
  const addSponsor = useCallback((s: Sponsor) => {
    // Persist the base columns optimistically; aggregates derive from funds.
    const base: SponsorBase = {
      id: s.id,
      name: s.name,
      initials: s.initials,
      country: s.country,
      color: s.color,
      asset_classes: s.asset_classes ?? [],
    };
    setSponsors((p) => [...p, base]);
    persist({ intent: "create-sponsor", sponsor: base });
  }, [persist]);

  const addFund = useCallback((f: Fund) => {
    setFunds((p) => [...p, f]);
    persist({ intent: "create-fund", fund: f });
  }, [persist]);

  const updateFund = useCallback((id: string, patch: Partial<Fund>) => {
    setFunds((p) => p.map((f) => (f.id === id ? { ...f, ...patch } : f)));
    persist({ intent: "update-fund", id, patch });
  }, [persist]);

  const deleteFund = useCallback((id: string) => {
    setFunds((p) => p.filter((f) => f.id !== id));
    persist({ intent: "delete-fund", id });
  }, [persist]);

  const addCompany = useCallback((fundId: string, c: PortfolioCompany) => {
    setCompanies((prev) => ({ ...prev, [fundId]: [...(prev[fundId] || []), c] }));
  }, []);

  const updateFundEntity = useCallback((fundId: string, newEntityId: string) => {
    setFunds((prev) => prev.map((f) => (f.id === fundId ? { ...f, entity_id: newEntityId } : f)));
    persist({ intent: "update-fund", id: fundId, patch: { entity_id: newEntityId } });
  }, [persist]);

  // ── direct investments (Supabase-backed) ───────────────────────────────
  const addDirect = useCallback((d: DirectInvestment) => {
    setDirects((p) => [...p, d]); // optimistic
    persist({ intent: "create-direct", direct: d });
  }, [persist]);

  const updateDirect = useCallback((id: string, patch: Partial<DirectInvestment>) => {
    setDirects((p) => p.map((d) => (d.id === id ? { ...d, ...patch } : d)));
    persist({ intent: "update-direct", id, patch });
  }, [persist]);

  const deleteDirect = useCallback((id: string) => {
    setDirects((p) => p.filter((d) => d.id !== id));
    persist({ intent: "delete-direct", id });
  }, [persist]);

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
    persist({ intent: "add-valuation", id: directId, entry });
  }, [persist]);

  const getDirect = useCallback(
    (id: string) => directInvestments.find((d) => d.id === id),
    [directInvestments]
  );

  // ── taxonomy (Supabase-backed; persist the whole lists object) ─────────
  const persistTaxonomy = useCallback((next: TaxonomyLists) => {
    setTaxonomy(next); // optimistic
    persist({ intent: "put-taxonomy", lists: next });
  }, [persist]);

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
      if (next !== prev) persist({ intent: "put-taxonomy", lists: next });
      return next;
    });
  }, [persist]);

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
        if (next !== prev) persist({ intent: "put-taxonomy", lists: next });
        return next;
      });
    },
    [persist]
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
        if (next !== prev) persist({ intent: "put-taxonomy", lists: next });
        return next;
      });
    },
    [persist]
  );

  // persistTaxonomy retained for potential bulk use
  void persistTaxonomy;

  // ── documents (Supabase-backed) ────────────────────────────────────────
  const addDocument = useCallback((d: Document) => {
    setDocuments((p) => [d, ...p]); // optimistic
    persist({ intent: "create-document", document: d });
  }, [persist]);

  const updateDocumentStatus = useCallback((id: string, status: string) => {
    setDocuments((p) => p.map((d) => (d.id === id ? { ...d, status } : d)));
    persist({ intent: "update-document-status", id, status });
  }, [persist]);

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
    persist({ intent: "approve-doc-field", id, fieldId, approved });
  }, [persist]);

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
    persist({ intent: "upsert-graph-meta", meta }, { silent: true });
  }, [persist]);

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
