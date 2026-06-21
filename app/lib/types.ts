export interface Investment {
  id: string;
  name: string;
  sponsor: string;
  investment_type: string;
  nav: number;
  tvpi: number;
  dpi: number;
  rvpi: number;
  irr: number;
  status: string;
  theme: string;
}

export interface Kpi {
  label: string;
  value: string;
  color: string;
}

export interface Theme {
  name: string;
  nav: number;
  pct: number;
  tvpi: number;
  irr: number;
  color: string;
}

export interface Document {
  id: string;
  name: string;
  doc_type: string;
  fund: string;
  status: string;
  confidence: number | null;
  date: string;
  size: string;
  fields: number;
  extracted: number;
  sponsor_id: string | null;
  fund_id: string | null;
  /** Direct-investment this doc attaches to (client-seed id), if any. */
  direct_id?: string | null;
  /** Public URL of the real downloadable asset in the Storage bucket. */
  file_url?: string | null;
  /** Storage path within the `documents` bucket. */
  storage_path?: string | null;
  /** Page count for the PDF preview / page nav. */
  pages?: number | null;
  /** Extracted key/value fields shown in the Document Viewer + Review. */
  extracted_fields?: ReviewField[];
  /** CAS metadata. */
  vehicle?: string | null;
  period_end?: string | null;
}

export interface ReviewDocument {
  id: string;
  name: string;
  fund: string;
  doc_type: string;
  confidence: number;
  fields: ReviewField[];
}

export interface ReviewField {
  id: string;
  key: string;
  value: string;
  confidence: number;
  page: number;
  approved: boolean | null;
  flagged: boolean;
}

/**
 * A clickable source behind an Atlas-AI answer. Each chip resolves to a real
 * record: a document (opens the Document Viewer at `page`) or a ledger entry
 * (jumps to the highlighted Audit Ledger row). No decorative-only chips.
 */
export interface Citation {
  /** Display label, e.g. "Apex Q3 Statement · p.3". */
  label: string;
  kind: "document" | "ledger";
  /** When kind === "document". */
  document_id?: string;
  page?: number;
  /** When kind === "ledger" — an audit_log row id. */
  ledger_entry_id?: string;
}

export interface CopilotMessage {
  role: string;
  text: string;
  table?: string[][];
  citations?: Citation[];
  total?: string;
}

export interface CopilotSuggestion {
  text: string;
}

// Phase 1 — new types

export interface BeneficialOwner {
  name: string;
  ownership_pct: number;
  role?: string | null;
}

export interface Entity {
  // Core
  id: string;
  name: string;
  short: string;
  nav: number;

  // Legal identity
  entity_type?: string | null;
  jurisdiction_country?: string | null;
  jurisdiction_state?: string | null;
  formation_date?: string | null; // YYYY-MM-DD
  tax_id?: string | null;
  registration_number?: string | null;
  status?: string | null; // Active | Dormant | Dissolved

  // Registered address
  address_street?: string | null;
  address_city?: string | null;
  address_state?: string | null;
  address_postal_code?: string | null;
  address_country?: string | null;

  // Primary contact
  contact_name?: string | null;
  contact_title?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  website?: string | null;

  // Tax & compliance
  tax_classification?: string | null;
  fatca_status?: string | null;
  kyc_verified_date?: string | null;
  kyc_verified_by?: string | null;
  risk_rating?: string | null; // Low | Medium | High

  // Beneficial ownership
  beneficial_owners?: BeneficialOwner[];

  // Financial
  base_currency?: string | null;
  source_of_wealth?: string | null;

  // Notes
  notes?: string | null;
}

export interface Organization {
  /** The family or company name shown across the platform. */
  name: string;
  /** True once the user has completed the onboarding wizard. */
  onboarded: boolean;
}

export interface Sponsor {
  id: string;
  name: string;
  initials: string;
  country: string;
  color: string;
  fund_count: number;
  total_nav: number;
  total_commitment: number;
  tvpi: number;
  net_irr: number;
  asset_classes: string[];
  company_count: number;
}

/** The persisted columns of a sponsor; the aggregate metrics above are derived
 *  from the sponsor's funds at read time (see `lib/portfolio.ts`). */
export type SponsorBase = Pick<
  Sponsor,
  "id" | "name" | "initials" | "country" | "color" | "asset_classes"
>;

/** Subjective traffic-light risk rating used across funds and directs. */
export type RiskRating = "green" | "yellow" | "red";

export interface Fund {
  id: string;
  sponsor_id: string;
  entity_id: string;
  name: string;
  vintage: number;
  strategy: string;
  asset_class: string;
  sub_theme?: string | null;
  ticket_size?: string | null;
  fund_size?: string | null;
  geography: string;
  currency: string;
  commitment: number;
  paid_in: number;
  nav: number;
  distributions: number;
  unfunded: number;
  tvpi: number;
  dpi: number;
  rvpi: number;
  gross_irr: number;
  net_irr: number;
  gross_moic: number;
  net_moic: number;
  pct_called: number;
  latest_report_q: string;
  report_received: boolean;
  risk_rating?: RiskRating | null;
  transactions: Transaction[];
  companies: PortfolioCompany[];
  nav_history: NavPoint[];
  cashflows: CashflowPoint[];
  /** Dated contributions/distributions with running paid-in + unfunded. */
  capital_log?: CapitalLogEntry[];
}

/** A single dated capital event for a fund (call or distribution). */
export interface CapitalLogEntry {
  date: string; // YYYY-MM-DD
  type: "call" | "distribution";
  amount: number;
  note?: string;
}

/** One dated valuation observation for a direct investment. */
export interface ValuationEntry {
  date: string; // YYYY-MM-DD
  value: number;
  note?: string;
}

/**
 * A direct/co-investment in a single company or asset. Structurally
 * distinct from a Fund — no commitment/called mechanics by default,
 * instead cost basis + a running valuation history.
 */
export interface DirectInvestment {
  id: string;
  entity_id: string;
  name: string; // company / asset name
  sector: string; // from taxonomy "sectors"
  asset_class: string; // Direct Equity | Co-investment | SPV | Club Deal
  geography: string;
  currency: string;
  investment_date: string; // YYYY-MM-DD
  cost: number; // initial investment / cost basis
  valuation: number; // current valuation (latest entry)
  valuation_date: string; // YYYY-MM-DD
  ownership_pct: number;
  stage: string; // Seed | Series A/B/C | Growth | Pre-IPO | Mature
  risk_rating: RiskRating;
  net_irr?: number;
  distributions?: number;
  valuation_history: ValuationEntry[];
  nav_history?: NavPoint[];
}

export interface PortfolioCompany {
  name: string;
  theme: string;
  stage: string | null;
  date: string;
  status: string;
  invested: number;
  fmv: number;
  moic: number;
  irr: number;
  own: number;
}

export interface NavPoint {
  q: string;
  nav: number;
}

export interface CashflowPoint {
  q: string;
  calls: number;
  dist: number;
}

export interface Transaction {
  date: string;
  tx_type: string;
  amount: number;
  note: string;
}

// ── Taxonomy (editable dropdown lists, shared App-level state) ───────────

/**
 * Editable controlled vocabularies that drive every dropdown in the Add
 * flows. `strategies` is keyed by asset class so the Strategy dropdown can
 * depend on the selected Asset Class.
 */
export interface TaxonomyLists {
  assetClasses: string[];
  strategies: Record<string, string[]>; // asset class -> strategies
  subThemes: string[];
  geographies: string[];
  currencies: string[];
  sectors: string[]; // direct-investment sectors
  directAssetClasses: string[];
  directStages: string[];
  ticketSizes: string[];
  fundSizes: string[];
  riskRatings: { value: RiskRating; label: string }[];
}

// ── Roles & permissions ──────────────────────────────────────────────────

export type RoleId =
  | "ceo"
  | "head_portfolio"
  | "senior_analyst"
  | "analyst"
  | "viewer";

export type Permission =
  | "fund.add"
  | "fund.edit"
  | "fund.delete"
  | "direct.add"
  | "direct.edit"
  | "direct.delete"
  | "entity.add"
  | "entity.edit"
  | "entity.delete"
  | "kyc.edit"
  | "company.add"
  | "transaction.add"
  | "valuation.update"
  | "document.upload"
  | "document.approve"
  | "taxonomy.add"
  | "taxonomy.manage"
  | "users.manage"
  | "export"
  | "ledger.view"
  | "kyc.view"
  | "graph.edit";

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: RoleId;
}

export interface AuditEntry {
  id: string;
  timestamp: string; // ISO
  user: string;
  action: string; // create | update | delete | approve | valuation-update | login ...
  entity: string; // human label of the affected object
  field?: string | null;
  old_value?: string | null;
  new_value?: string | null;
  screen: string;
}

// ── Segundo Cerebro (knowledge-graph) node metadata ──────────────────────

/**
 * The knowledge-graph node "kinds". Concrete kinds map to real records;
 * concept kinds (theme/geo/vintage/strategy) are synthesised in build-graph
 * and shared across every position tagged with that value.
 */
export type GraphNodeType =
  | "root"
  | "entity"
  | "sponsor"
  | "fund"
  | "direct"
  | "company"
  | "theme"
  | "geo"
  | "vintage"
  | "strategy"
  | "document";

/**
 * Per-node user data persisted in Supabase (`graph_node_meta`). Mirrors the
 * table row shape exactly (snake_case), like `DirectInvestment`. One row per
 * (organization_id, node_ref_id, node_type).
 */
export interface GraphNodeMeta {
  id: string; // gm-{uuid}
  organization_id?: string; // server-stamped; optional on the client
  node_ref_id: string; // record id or concept id ("theme:Fintech")
  node_type: GraphNodeType;
  notes_text: string;
  pinned: boolean;
  hidden: boolean;
  pinned_x?: number | null;
  pinned_y?: number | null;
  created_at?: string;
  updated_at?: string;
}
