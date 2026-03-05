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

export interface CopilotMessage {
  role: string;
  text: string;
  table?: string[][];
  citations?: string[];
  total?: string;
}

export interface CopilotSuggestion {
  text: string;
}

// Phase 1 — new types

export interface Entity {
  id: string;
  name: string;
  short: string;
  nav: number;
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

export interface Fund {
  id: string;
  sponsor_id: string;
  entity_id: string;
  name: string;
  vintage: number;
  strategy: string;
  asset_class: string;
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
  companies: PortfolioCompany[];
  nav_history: NavPoint[];
  cashflows: CashflowPoint[];
}

export interface PortfolioCompany {
  name: string;
  theme: string;
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
