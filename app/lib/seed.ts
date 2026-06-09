import type {
  DirectInvestment,
  Entity,
  Fund,
  Sponsor,
  RiskRating,
} from "~/lib/types";

/**
 * Seed data layered on top of whatever the backend serves. The platform
 * already ships ~6 funds from the API; we add 2 more funds (to reach ~8)
 * plus 7 direct investments (Change 7 — ~15 total, 50/50 split).
 *
 * Funds/directs reference an `entity_id`, but entity ids are runtime values
 * from the backend — so the seed is produced by factory functions that take
 * the live entities and round-robin assign.
 */

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

/** Seed monetary fields are authored in $MM for readability; the rest of
 *  the platform stores raw dollars (formatCurrency divides by 1e6), so we
 *  scale on the way out. */
const MM = 1_000_000;

/** Two GP sponsors that back the seeded funds (so map nodes get a color). */
export const SEED_SPONSORS: Sponsor[] = [
  {
    id: "s-seed-andes",
    name: "Andes Capital Partners",
    initials: "AC",
    country: "México",
    color: "#5BC8AF",
    fund_count: 1,
    total_nav: 0,
    total_commitment: 0,
    tvpi: 0,
    net_irr: 0,
    asset_classes: ["Private Credit"],
    company_count: 0,
  },
  {
    id: "s-seed-pampa",
    name: "Pampa Infrastructure",
    initials: "PI",
    country: "Brasil",
    color: "#D8A14A",
    fund_count: 1,
    total_nav: 0,
    total_commitment: 0,
    tvpi: 0,
    net_irr: 0,
    asset_classes: ["Infrastructure"],
    company_count: 0,
  },
];

function navSeries(start: number, end: number, points: number): { q: string; nav: number }[] {
  const out: { q: string; nav: number }[] = [];
  const years = points;
  for (let i = 0; i < years; i++) {
    const t = i / (years - 1);
    const nav = Math.round((start + (end - start) * t) * 10) / 10;
    out.push({ q: `${2019 + i}`, nav });
  }
  return out;
}

export function buildSeedFunds(entities: Entity[]): Fund[] {
  if (entities.length === 0) return [];
  const e = (i: number) => pick(entities, i).id;

  const f1: Fund = {
    id: "f-seed-andes-credit-ii",
    sponsor_id: "s-seed-andes",
    entity_id: e(1),
    name: "Andes Direct Lending Fund II",
    vintage: 2021,
    strategy: "Direct Lending",
    asset_class: "Private Credit",
    sub_theme: "Infrastructure & Energy",
    ticket_size: "$50-200MM",
    fund_size: "$500MM-$1BN",
    geography: "Latin America",
    currency: "USD",
    commitment: 25,
    paid_in: 18.5,
    nav: 19.8,
    distributions: 4.2,
    unfunded: 6.5,
    tvpi: 0,
    dpi: 0,
    rvpi: 0,
    gross_irr: 12.4,
    net_irr: 9.8,
    gross_moic: 1.4,
    net_moic: 1.3,
    pct_called: 0,
    latest_report_q: "Q1 2026",
    report_received: true,
    risk_rating: "green",
    transactions: [],
    companies: [],
    nav_history: navSeries(0, 19.8, 6).map((p, i) => ({ q: `${2021 + i}`, nav: p.nav })),
    cashflows: [
      { q: "2021", calls: 8, dist: 0 },
      { q: "2022", calls: 6, dist: 1.2 },
      { q: "2023", calls: 4.5, dist: 1.5 },
      { q: "2024", calls: 0, dist: 1.5 },
    ],
    capital_log: [
      { date: "2021-03-15", type: "call", amount: 8, note: "Initial call" },
      { date: "2022-02-10", type: "call", amount: 6 },
      { date: "2022-11-30", type: "distribution", amount: 1.2, note: "Interest income" },
      { date: "2023-06-20", type: "call", amount: 4.5 },
      { date: "2024-01-15", type: "distribution", amount: 3 },
    ],
  };

  const f2: Fund = {
    id: "f-seed-pampa-infra-i",
    sponsor_id: "s-seed-pampa",
    entity_id: e(2),
    name: "Pampa Energy Transition Fund I",
    vintage: 2019,
    strategy: "Greenfield",
    asset_class: "Infrastructure",
    sub_theme: "Infrastructure & Energy",
    ticket_size: "$200-400MM",
    fund_size: "$1-5BN",
    geography: "Latin America",
    currency: "USD",
    commitment: 40,
    paid_in: 36,
    nav: 52,
    distributions: 14,
    unfunded: 4,
    tvpi: 0,
    dpi: 0,
    rvpi: 0,
    gross_irr: 18.5,
    net_irr: 15.2,
    gross_moic: 1.9,
    net_moic: 1.7,
    pct_called: 0,
    latest_report_q: "Q1 2026",
    report_received: false,
    risk_rating: "yellow",
    transactions: [],
    companies: [],
    nav_history: navSeries(0, 52, 7),
    cashflows: [
      { q: "2019", calls: 12, dist: 0 },
      { q: "2020", calls: 10, dist: 2 },
      { q: "2021", calls: 8, dist: 3 },
      { q: "2022", calls: 6, dist: 4 },
      { q: "2023", calls: 0, dist: 5 },
    ],
    capital_log: [
      { date: "2019-05-01", type: "call", amount: 12, note: "Initial call" },
      { date: "2020-04-12", type: "call", amount: 10 },
      { date: "2021-07-08", type: "distribution", amount: 5, note: "Asset sale" },
      { date: "2022-09-22", type: "call", amount: 6 },
      { date: "2023-12-01", type: "distribution", amount: 9 },
    ],
  };

  return [f1, f2].map(finalizeFund);
}

/** Recompute derived ratios (scale-invariant, so done in $MM) then scale
 *  all absolute monetary fields to raw dollars. */
function finalizeFund(f: Fund): Fund {
  const pct_called = f.commitment > 0 ? (f.paid_in / f.commitment) * 100 : 0;
  const tvpi = f.paid_in > 0 ? (f.distributions + f.nav) / f.paid_in : 0;
  const dpi = f.paid_in > 0 ? f.distributions / f.paid_in : 0;
  const rvpi = f.paid_in > 0 ? f.nav / f.paid_in : 0;
  return {
    ...f,
    pct_called,
    tvpi,
    dpi,
    rvpi,
    commitment: f.commitment * MM,
    paid_in: f.paid_in * MM,
    nav: f.nav * MM,
    distributions: f.distributions * MM,
    unfunded: f.unfunded * MM,
    nav_history: f.nav_history.map((p) => ({ ...p, nav: p.nav * MM })),
    cashflows: f.cashflows.map((c) => ({ ...c, calls: c.calls * MM, dist: c.dist * MM })),
    capital_log: (f.capital_log || []).map((c) => ({ ...c, amount: c.amount * MM })),
  };
}

interface DirectSeed {
  name: string;
  sector: string;
  asset_class: string;
  geography: string;
  currency: string;
  investment_date: string;
  cost: number;
  valuation: number;
  valuation_date: string;
  ownership_pct: number;
  stage: string;
  risk: RiskRating;
  net_irr: number;
  history: { date: string; value: number; note?: string }[];
}

const DIRECT_SEEDS: DirectSeed[] = [
  {
    name: "Clip (Payclip)", sector: "Fintech", asset_class: "Direct Equity",
    geography: "México", currency: "USD", investment_date: "2021-06-01",
    cost: 5, valuation: 11.2, valuation_date: "2025-12-31", ownership_pct: 3.1,
    stage: "Growth", risk: "green", net_irr: 22.4,
    history: [
      { date: "2021-06-01", value: 5, note: "Series C entry" },
      { date: "2023-03-15", value: 8.4, note: "Series D markup" },
      { date: "2025-12-31", value: 11.2, note: "Internal revaluation" },
    ],
  },
  {
    name: "Unima Health", sector: "Healthtech", asset_class: "Co-investment",
    geography: "México", currency: "USD", investment_date: "2022-02-10",
    cost: 3, valuation: 2.4, valuation_date: "2025-09-30", ownership_pct: 6.5,
    stage: "Series B", risk: "yellow", net_irr: -8.1,
    history: [
      { date: "2022-02-10", value: 3 },
      { date: "2024-01-20", value: 3.1, note: "Flat round" },
      { date: "2025-09-30", value: 2.4, note: "Down markdown" },
    ],
  },
  {
    name: "Nowports", sector: "Logistics", asset_class: "Direct Equity",
    geography: "Latin America", currency: "USD", investment_date: "2021-11-05",
    cost: 4, valuation: 6.8, valuation_date: "2025-12-31", ownership_pct: 2.8,
    stage: "Series C", risk: "green", net_irr: 16.9,
    history: [
      { date: "2021-11-05", value: 4 },
      { date: "2023-08-12", value: 6.2, note: "Series C extension" },
      { date: "2025-12-31", value: 6.8 },
    ],
  },
  {
    name: "Kueski Data Labs", sector: "Data / AI", asset_class: "SPV",
    geography: "México", currency: "USD", investment_date: "2023-04-18",
    cost: 2.5, valuation: 3.9, valuation_date: "2025-12-31", ownership_pct: 4.2,
    stage: "Series A", risk: "green", net_irr: 28.5,
    history: [
      { date: "2023-04-18", value: 2.5 },
      { date: "2024-10-01", value: 3.2 },
      { date: "2025-12-31", value: 3.9, note: "AI segment re-rated" },
    ],
  },
  {
    name: "Bright Solar MX", sector: "Cleantech", asset_class: "Club Deal",
    geography: "México", currency: "MXN", investment_date: "2020-09-30",
    cost: 6, valuation: 5.1, valuation_date: "2025-06-30", ownership_pct: 9.0,
    stage: "Growth", risk: "red", net_irr: -4.2,
    history: [
      { date: "2020-09-30", value: 6 },
      { date: "2023-02-28", value: 5.8, note: "Tariff headwinds" },
      { date: "2025-06-30", value: 5.1, note: "Impairment" },
    ],
  },
  {
    name: "Justo", sector: "Consumer", asset_class: "Direct Equity",
    geography: "México", currency: "USD", investment_date: "2022-07-22",
    cost: 3.5, valuation: 4.6, valuation_date: "2025-12-31", ownership_pct: 1.9,
    stage: "Series B", risk: "yellow", net_irr: 11.0,
    history: [
      { date: "2022-07-22", value: 3.5 },
      { date: "2024-05-10", value: 4.1 },
      { date: "2025-12-31", value: 4.6 },
    ],
  },
  {
    name: "Vía Toll Concession", sector: "Infrastructure", asset_class: "Co-investment",
    geography: "Latin America", currency: "USD", investment_date: "2019-03-12",
    cost: 8, valuation: 13.5, valuation_date: "2025-12-31", ownership_pct: 12.0,
    stage: "Mature", risk: "green", net_irr: 13.7,
    history: [
      { date: "2019-03-12", value: 8 },
      { date: "2022-06-30", value: 10.8, note: "Traffic recovery" },
      { date: "2025-12-31", value: 13.5 },
    ],
  },
];

export function buildSeedDirects(entities: Entity[]): DirectInvestment[] {
  if (entities.length === 0) return [];
  return DIRECT_SEEDS.map((d, i) => ({
    id: `d-seed-${i}`,
    entity_id: pick(entities, i).id,
    name: d.name,
    sector: d.sector,
    asset_class: d.asset_class,
    geography: d.geography,
    currency: d.currency,
    investment_date: d.investment_date,
    cost: d.cost * MM,
    valuation: d.valuation * MM,
    valuation_date: d.valuation_date,
    ownership_pct: d.ownership_pct,
    stage: d.stage,
    risk_rating: d.risk,
    net_irr: d.net_irr,
    distributions: 0,
    valuation_history: d.history.map((h) => ({ ...h, value: h.value * MM })),
    nav_history: d.history.map((h) => ({ q: h.date.slice(0, 4), nav: h.value * MM })),
  }));
}
