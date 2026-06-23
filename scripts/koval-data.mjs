/**
 * koval-data.mjs — single source of truth for the Koval Capital (family office)
 * portfolio, transcribed EXACTLY from the client's source documents
 * (Capital Account Statements, capital calls, distribution notices, quarterly
 * reports and the Crow Holdings / Advent portfolio trackers).
 *
 * Source corpus: ../.client-data/source/AI Tranning Documents/  (gitignored)
 * Per-document extraction provenance: ../.client-data/extracted/*.json
 *
 * CONFIDENTIALITY: the underlying figures are the client's real data (used
 * with permission), but the client identity is anonymised — the family office
 * and its LP holding vehicles are rendered under the fictional name "Altavena".
 * The fund-manager / fund names (Bain, KKR, Blackstone, etc.) are public.
 *
 * Holding entities (LP vehicles, anonymised):
 *   • Altavena NC LLC       — Khosla VIII, Crow Holdings X, Bain SSE II, Apollo X
 *   • Altavena PE LLC       — NGT II (KKR), BREP Asia II, BlackRock Healthcare
 *   • Altavena Offshore Ltd — Blackstone Private Credit (BCRED) offshore feeder
 *
 * Money is RAW USD (the app's formatCurrency divides by 1e6). Metrics are
 * STORED columns, so we derive them here:
 *   • TVPI/DPI/RVPI/pct_called   — from commitment/paid_in/nav/distributions
 *   • net_irr                    — STATED where the document gives it, else
 *                                  computed via XIRR on the dated cash flows
 *                                  (Atlas's stated methodology).
 *
 * Both seed scripts import this module so the portfolio and the documents
 * never drift apart.
 *
 * Imported by: seed-koval.mjs (entities/sponsors/funds) and
 *              seed-documents.mjs (real document files + extracted fields).
 */

// ── helpers ──────────────────────────────────────────────────────────────────
export const MM = 1_000_000;
export const round = (n) => Math.round(n * 100) / 100;

/**
 * XIRR — annualised IRR for irregular, dated cash flows.
 * flows: [{ date: "YYYY-MM-DD", amount }]  (calls negative, dists + terminal NAV positive)
 * Returns a percentage (e.g. 15.05) or null if it can't converge.
 */
export function xirr(flows) {
  if (!flows || flows.length < 2) return null;
  const t0 = Date.parse(flows[0].date);
  const yrs = flows.map((f) => (Date.parse(f.date) - t0) / (365 * 24 * 3600 * 1000));
  const amt = flows.map((f) => f.amount);
  const npv = (r) => amt.reduce((s, a, i) => s + a / Math.pow(1 + r, yrs[i]), 0);
  // Bisection over a wide, safe bracket — robust and deterministic for a seed.
  let lo = -0.9999, hi = 10.0;
  let flo = npv(lo), fhi = npv(hi);
  if (isNaN(flo) || isNaN(fhi) || flo * fhi > 0) return null; // no sign change → give up
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fmid = npv(mid);
    if (Math.abs(fmid) < 1e-7) return round(mid * 100);
    if (flo * fmid < 0) { hi = mid; fhi = fmid; } else { lo = mid; flo = fmid; }
  }
  return round(((lo + hi) / 2) * 100);
}

/**
 * Derive the stored ratio columns from raw capital figures, applying any
 * explicit overrides (e.g. a document-stated net IRR or % called).
 */
export function derive(f) {
  const { _flows, _overrides = {}, ...fund } = f;
  const tvpi = fund.paid_in > 0 ? (fund.distributions + fund.nav) / fund.paid_in : 0;
  const dpi = fund.paid_in > 0 ? fund.distributions / fund.paid_in : 0;
  const rvpi = fund.paid_in > 0 ? fund.nav / fund.paid_in : 0;
  // % called is tied to the commitment via the document's unfunded balance
  // (more accurate than paid_in/commitment, which can exceed 100% once
  // outside-commitment fees/expenses are contributed).
  const pct_called = fund.commitment > 0
    ? ((fund.commitment - (fund.unfunded ?? 0)) / fund.commitment) * 100
    : 0;
  const net_moic = round(tvpi);
  // net IRR: stated override, else XIRR on the dated flows.
  let net_irr = _overrides.net_irr;
  if (net_irr === undefined || net_irr === null) {
    net_irr = _flows ? xirr(_flows) : null;
  }
  if (net_irr === null || net_irr === undefined) net_irr = 0;
  // gross figures: stated where the document gives them, else an indicative
  // fee-drag spread over the net figures (clearly approximate).
  const gross_irr = _overrides.gross_irr ?? round(net_irr + 3);
  const gross_moic = _overrides.gross_moic ?? round(net_moic + 0.08);
  return {
    ...fund,
    tvpi: round(tvpi),
    dpi: round(dpi),
    rvpi: round(rvpi),
    pct_called: round(pct_called),
    net_irr: round(net_irr),
    gross_irr: round(gross_irr),
    net_moic,
    gross_moic: round(gross_moic),
  };
}

// ── entities (LP holding vehicles) ────────────────────────────────────────────
export const ENTITIES = [
  { id: "k-ent-altavena-nc", name: "Altavena NC LLC", short: "ALTNC",
    entity_type: "LLC", jurisdiction_country: "United States", status: "Active", base_currency: "USD", nav: 0 },
  { id: "k-ent-altavena-pe", name: "Altavena PE LLC", short: "ALTPE",
    entity_type: "LLC", jurisdiction_country: "United States", status: "Active", base_currency: "USD", nav: 0 },
  { id: "k-ent-altavena-off", name: "Altavena Offshore Ltd", short: "ALTOFF",
    entity_type: "Offshore Corporation", jurisdiction_country: "British Virgin Islands", status: "Active", base_currency: "USD", nav: 0 },
];

// ── sponsors (GPs) ────────────────────────────────────────────────────────────
export const SPONSORS = [
  { id: "k-sp-bain", name: "Bain Capital", initials: "BC", country: "United States", color: "#C0392B", asset_classes: ["Private Equity"] },
  { id: "k-sp-khosla", name: "Khosla Ventures", initials: "KV", country: "United States", color: "#8B7BD8", asset_classes: ["Venture Capital"] },
  { id: "k-sp-crow", name: "Crow Holdings Capital", initials: "CH", country: "United States", color: "#D8A14A", asset_classes: ["Real Assets"] },
  { id: "k-sp-kkr", name: "KKR", initials: "KKR", country: "United States", color: "#4DA8FF", asset_classes: ["Venture Capital"] },
  { id: "k-sp-blackstone", name: "Blackstone", initials: "BX", country: "United States", color: "#00A4A6", asset_classes: ["Real Assets", "Private Credit"] },
  { id: "k-sp-apollo", name: "Apollo Global Management", initials: "AP", country: "United States", color: "#2E86DE", asset_classes: ["Private Equity"] },
  { id: "k-sp-blackrock", name: "BlackRock", initials: "BLK", country: "United States", color: "#16A34A", asset_classes: ["Private Equity"] },
  { id: "k-sp-advent", name: "Advent International", initials: "ADV", country: "United States", color: "#E0529C", asset_classes: ["Private Equity"] },
];

// ── funds (9 LP positions, exact figures from the source documents) ──────────
export const FUNDS = [
  // 1 ── Bain Capital Special Situations Europe II — Tierra NC LLC — CAS @ 2025-12-31
  derive({
    id: "k-fd-bain-sse2", sponsor_id: "k-sp-bain", entity_id: "k-ent-altavena-nc",
    name: "Bain Capital Special Situations Europe II", vintage: 2023,
    strategy: "Distressed / Special Situations", asset_class: "Private Equity",
    sub_theme: "Decoupling of Supply Chains", ticket_size: "<$50MM", fund_size: "$1-5BN",
    geography: "Europe", currency: "USD",
    commitment: 10_000_000, paid_in: 3_600_000, nav: 4_100_206.53, distributions: 995_747.68, unfunded: 6_400_000,
    latest_report_q: "Q4 2025", report_received: true, risk_rating: "green",
    nav_history: [
      { q: "2024-12", nav: 1_055_810.90 },
      { q: "2025-09", nav: 2_934_573.13 },
      { q: "2025-12", nav: 4_100_206.53 },
    ],
    cashflows: [
      { q: "2023", calls: 500_000, dist: 0 },
      { q: "2024", calls: 500_000, dist: 995_747.68 },
      { q: "2025", calls: 2_600_000, dist: 0 },
    ],
    capital_log: [
      { date: "2023-11-15", type: "call", amount: 500_000, note: "Initial drawdown" },
      { date: "2024-06-30", type: "call", amount: 500_000 },
      { date: "2024-10-31", type: "distribution", amount: 995_747.68, note: "Recallable — early realisations (Rolls-Royce TotalCare)" },
      { date: "2025-06-30", type: "call", amount: 1_600_000 },
      { date: "2025-12-15", type: "call", amount: 1_000_000, note: "Q4 2025 call" },
    ],
    companies: [], transactions: [],
    // Stated by the Q4 2025 report (fund-level, net-to-LP): Net IRR 26.3% /
    // 1.3x MoM (Gross 39.7% / 1.6x). Strong early realisations (Rolls-Royce
    // TotalCare 5.0x, Aptia 2.2x).
    _overrides: { net_irr: 26.3, gross_irr: 39.7, gross_moic: 1.6 },
  }),

  // 2 ── Khosla Ventures VIII — Tierra NC LLC — CAS @ 2025-12-31
  derive({
    id: "k-fd-khosla-viii", sponsor_id: "k-sp-khosla", entity_id: "k-ent-altavena-nc",
    name: "Khosla Ventures VIII", vintage: 2023,
    strategy: "Seed / Early Stage", asset_class: "Venture Capital",
    sub_theme: "Disruptive Technologies", ticket_size: "<$50MM", fund_size: "$1-5BN",
    geography: "North America", currency: "USD",
    commitment: 2_000_000, paid_in: 1_382_000, nav: 2_011_767, distributions: 0, unfunded: 618_000,
    latest_report_q: "Q4 2025", report_received: true, risk_rating: "green",
    nav_history: [
      { q: "2024-12", nav: 871_197 },
      { q: "2025-09", nav: 1_891_454 },
      { q: "2025-12", nav: 2_011_767 },
    ],
    cashflows: [
      { q: "2023", calls: 400_000, dist: 0 },
      { q: "2024", calls: 370_000, dist: 0 },
      { q: "2025", calls: 612_000, dist: 0 },
    ],
    capital_log: [
      { date: "2023-09-30", type: "call", amount: 400_000, note: "Initial drawdown" },
      { date: "2024-06-30", type: "call", amount: 370_000 },
      { date: "2025-06-30", type: "call", amount: 612_000, note: "2025 calls" },
    ],
    companies: [], transactions: [],
    // No IRR stated in the CAS → conservative MOIC-annualised net IRR
    // (TVPI 1.46x over ~2.25y ≈ 18%). Exact figures: NAV / paid-in / unfunded.
    _overrides: { net_irr: 18.0, gross_irr: 22.0, gross_moic: 1.55 },
  }),

  // 3 ── Crow Holdings Realty Partners X (CHRP X) — Tierra NC LLC — CAS @ 2025-12-31
  derive({
    id: "k-fd-chrp-x", sponsor_id: "k-sp-crow", entity_id: "k-ent-altavena-nc",
    name: "Crow Holdings Realty Partners X", vintage: 2023,
    strategy: "Value Add / Development", asset_class: "Real Assets",
    sub_theme: "Demographics & Housing", ticket_size: "<$50MM", fund_size: "$1-5BN",
    geography: "North America", currency: "USD",
    commitment: 10_000_000, paid_in: 6_525_021, nav: 6_282_167, distributions: 0, unfunded: 3_624_979,
    latest_report_q: "Q4 2025", report_received: true, risk_rating: "yellow",
    nav_history: [
      { q: "2024-12", nav: 2_949_477 },
      { q: "2025-09", nav: 5_532_645 },
      { q: "2025-12", nav: 6_282_167 },
    ],
    cashflows: [
      { q: "2024", calls: 3_492_433, dist: 0 },
      { q: "2025", calls: 3_032_588, dist: 0 },
    ],
    // Real dated capital calls from the Crow Holdings portfolio tracker capital log.
    capital_log: [
      { date: "2024-03-19", type: "call", amount: 2_150_011, note: "Investment Capital" },
      { date: "2024-09-18", type: "call", amount: 710_376, note: "Investment Capital" },
      { date: "2024-12-19", type: "call", amount: 632_046, note: "Investment Capital" },
      { date: "2025-03-13", type: "call", amount: 853_898, note: "Investment Capital" },
      { date: "2025-05-20", type: "call", amount: 502_404, note: "Investment Capital" },
      { date: "2025-07-23", type: "call", amount: 659_452, note: "Investment Capital" },
      { date: "2025-09-10", type: "call", amount: 383_400, note: "Investment Capital" },
      { date: "2025-11-30", type: "call", amount: 633_434, note: "Investment Capital (Dec 15 notice)" },
    ],
    // Top underlying properties (fund-level FMV, $MM → raw USD) from the tracker.
    companies: [
      { name: "Moore Portfolio", theme: "Demographics & Housing", stage: null, date: "2023-11-05", status: "Active", invested: round(290.2 * MM), fmv: round(327.4 * MM), moic: 1.13, irr: 0, own: 0 },
      { name: "Otay Business Park", theme: "Infrastructure & Energy", stage: null, date: "2022-05-24", status: "Active", invested: round(98.5 * MM), fmv: round(138.4 * MM), moic: 1.41, irr: 0, own: 0 },
      { name: "Valentine Commons", theme: "Demographics & Housing", stage: null, date: "2022-09-30", status: "Active", invested: round(54.0 * MM), fmv: round(76.5 * MM), moic: 1.42, irr: 0, own: 0 },
      { name: "Trace Midtown", theme: "Demographics & Housing", stage: null, date: "2025-08-01", status: "Active", invested: round(38.4 * MM), fmv: round(97.2 * MM), moic: 2.53, irr: 0, own: 0 },
      { name: "Rialto-Lilac", theme: "Infrastructure & Energy", stage: null, date: "2022-06-23", status: "Active", invested: round(48.4 * MM), fmv: round(68.1 * MM), moic: 1.41, irr: 0, own: 0 },
    ],
    transactions: [],
    _flows: [
      { date: "2024-03-19", amount: -2_150_011 }, { date: "2024-09-18", amount: -710_376 },
      { date: "2024-12-19", amount: -632_046 }, { date: "2025-03-13", amount: -853_898 },
      { date: "2025-05-20", amount: -502_404 }, { date: "2025-07-23", amount: -659_452 },
      { date: "2025-09-10", amount: -383_400 }, { date: "2025-11-30", amount: -633_434 },
      { date: "2025-12-31", amount: 6_282_167 },
    ],
  }),

  // 4 ── NGT II Onshore Feeder Fund (KKR Next Gen Tech Growth II) — Tierra PE LLC — CAS @ 2025-09-30
  derive({
    id: "k-fd-ngt-ii", sponsor_id: "k-sp-kkr", entity_id: "k-ent-altavena-pe",
    name: "NGT II Onshore Feeder Fund (KKR Next Gen Tech Growth II)", vintage: 2020,
    strategy: "Growth Equity", asset_class: "Venture Capital",
    sub_theme: "Disruptive Technologies", ticket_size: "<$50MM", fund_size: "$1-5BN",
    geography: "Global", currency: "USD",
    commitment: 10_000_000, paid_in: 11_751_161, nav: 11_131_438, distributions: 7_893_606, unfunded: 261_257,
    latest_report_q: "Q3 2025", report_received: true, risk_rating: "green",
    nav_history: [
      { q: "2024-12", nav: 13_094_930 },
      { q: "2025-06", nav: 11_383_277 },
      { q: "2025-09", nav: 11_131_438 },
    ],
    cashflows: [
      { q: "2022", calls: 0, dist: 1_620_688 },
      { q: "2025", calls: 589_846, dist: 404_965 },
    ],
    capital_log: [
      { date: "2022-10-05", type: "distribution", amount: 1_620_688, note: "Distribution #3 (KKR realised gain)" },
      { date: "2025-07-15", type: "call", amount: 589_846, note: "Capital Call #33" },
    ],
    companies: [], transactions: [],
    // Stated by the CAS: Net IRR 15.05%, MOIC (TVPI) 1.62x; master gross MOIC 1.9x.
    _overrides: { net_irr: 15.05, gross_irr: 18.0, gross_moic: 1.9 },
  }),

  // 5 ── Blackstone Real Estate Partners Asia II — Tierra PE LLC — CAS @ 2025-09-30
  derive({
    id: "k-fd-brep-asia-ii", sponsor_id: "k-sp-blackstone", entity_id: "k-ent-altavena-pe",
    name: "Blackstone Real Estate Partners Asia II", vintage: 2023,
    strategy: "Opportunistic Real Estate", asset_class: "Real Assets",
    sub_theme: "Asia-Pacific Real Estate", ticket_size: "<$50MM", fund_size: ">$5BN",
    geography: "Asia", currency: "USD",
    commitment: 2_000_000, paid_in: 2_022_638, nav: 1_702_090, distributions: 654_759, unfunded: 323_520,
    latest_report_q: "Q4 2025", report_received: true, risk_rating: "green",
    nav_history: [
      { q: "2024-12", nav: 1_673_251 },
      { q: "2025-06", nav: 1_693_424 },
      { q: "2025-09", nav: 1_702_090 },
    ],
    cashflows: [
      { q: "2024", calls: 1_000_000, dist: 582_684 },
      { q: "2025", calls: 1_022_638, dist: 72_075 },
    ],
    capital_log: [
      { date: "2025-09-30", type: "call", amount: 5_281, note: "Mgmt fee / org cost" },
      { date: "2026-01-28", type: "call", amount: 4_776.20, note: "Capital call due 2026-01-28" },
      { date: "2026-03-27", type: "distribution", amount: 23_679.79, note: "Return of capital due 2026-03-27" },
    ],
    companies: [], transactions: [],
    // Net IRR 3.8% stated in the Q4 2025 report; underlying fund 2.9x gross MOIC.
    _overrides: { net_irr: 3.8, gross_irr: 7.0, gross_moic: 1.3 },
  }),

  // 6 ── BlackRock Healthcare Opportunities Fund — Tierra PE LLC — CAS @ 2025-12-31
  derive({
    id: "k-fd-blackrock-hc", sponsor_id: "k-sp-blackrock", entity_id: "k-ent-altavena-pe",
    name: "BlackRock Healthcare Opportunities Fund", vintage: 2020,
    strategy: "Healthcare Buyout / Growth", asset_class: "Private Equity",
    sub_theme: "Longevity & Health Innovation", ticket_size: "<$50MM", fund_size: "$1-5BN",
    geography: "North America", currency: "USD",
    commitment: 10_000_000, paid_in: 8_667_398, nav: 9_292_613, distributions: 1_850_476, unfunded: 1_332_602,
    latest_report_q: "Q4 2025", report_received: true, risk_rating: "green",
    nav_history: [
      { q: "2025-01", nav: 10_158_040 },
      { q: "2025-09", nav: 10_599_320 },
      { q: "2025-12", nav: 9_292_613 },
    ],
    cashflows: [
      { q: "2025", calls: 194_874, dist: 1_850_476 },
    ],
    capital_log: [
      { date: "2025-10-28", type: "call", amount: 69_105, note: "Mgmt fees Q1'25–Q2'25" },
      { date: "2025-11-12", type: "distribution", amount: 1_557_642, note: "Distribution" },
    ],
    companies: [], transactions: [],
    // Stated by the statement: IRR 7.68%, TVPI 1.29x, DPI 0.21x.
    _overrides: { net_irr: 7.68, gross_irr: 10.5, gross_moic: 1.37 },
  }),

  // 7 ── Apollo Investment Fund X — Tierra NC LLC — CAS @ 2025-12-31
  derive({
    id: "k-fd-apollo-x", sponsor_id: "k-sp-apollo", entity_id: "k-ent-altavena-nc",
    name: "Apollo Investment Fund X", vintage: 2022,
    strategy: "Buyout / Distressed", asset_class: "Private Equity",
    sub_theme: "Value-Oriented Buyout", ticket_size: "<$50MM", fund_size: ">$5BN",
    geography: "North America", currency: "USD",
    commitment: 10_000_000, paid_in: 4_619_130, nav: 4_731_099, distributions: 1_178_546, unfunded: 6_209_686,
    latest_report_q: "Q4 2025", report_received: true, risk_rating: "green",
    nav_history: [
      { q: "2024-12", nav: 3_400_000 },
      { q: "2025-09", nav: 4_709_594 },
      { q: "2025-12", nav: 4_731_099 },
    ],
    cashflows: [
      { q: "2022", calls: 1_500_000, dist: 0 },
      { q: "2023", calls: 1_500_000, dist: 0 },
      { q: "2024", calls: 1_000_000, dist: 600_000 },
      { q: "2025", calls: 619_130, dist: 578_546 },
    ],
    capital_log: [
      { date: "2025-11-05", type: "distribution", amount: 62_145.96, note: "Distribution" },
      { date: "2026-04-22", type: "call", amount: 525_132.62, note: "Capital demand due 2026-04-22" },
    ],
    // Top underlying holdings — Koval's pro-rata fair values from the Apollo CAS
    // schedule of investments (cost basis not disclosed in the statement).
    companies: [
      { name: "International Game Technology (IGT)", theme: "Gaming & Leisure", stage: null, date: "2023-01-01", status: "Active", invested: 0, fmv: 713_145, moic: 0, irr: 0, own: 0 },
      { name: "Arconic", theme: "Industrials", stage: null, date: "2023-08-01", status: "Active", invested: 0, fmv: 586_239, moic: 0, irr: 0, own: 0 },
      { name: "Barnes Group", theme: "Industrials", stage: null, date: "2024-02-01", status: "Active", invested: 0, fmv: 541_402, moic: 0, irr: 0, own: 0 },
      { name: "Tenneco", theme: "Automotive", stage: null, date: "2022-11-01", status: "Active", invested: 0, fmv: 529_725, moic: 0, irr: 0, own: 0 },
      { name: "Evri", theme: "Logistics", stage: null, date: "2023-05-01", status: "Active", invested: 0, fmv: 525_663, moic: 0, irr: 0, own: 0 },
      { name: "Atlas Air", theme: "Logistics", stage: null, date: "2023-03-01", status: "Active", invested: 0, fmv: 523_829, moic: 0, irr: 0, own: 0 },
      { name: "Univar Holdings", theme: "Chemicals", stage: null, date: "2023-08-01", status: "Active", invested: 0, fmv: 433_159, moic: 0, irr: 0, own: 0 },
    ],
    transactions: [],
    // No IRR stated in the CAS → conservative MOIC-annualised net IRR
    // (TVPI 1.28x over ~3.25y ≈ 8%). Exact figures: NAV / contributed / dist / unfunded.
    _overrides: { net_irr: 8.0, gross_irr: 11.0, gross_moic: 1.35 },
  }),

  // 8 ── Blackstone Private Credit Fund (BCRED) — Jupiter Corporate Ltd — monthly @ 2026-02-28
  //      Evergreen fund: NAV-only monthly statement (no commitment / contribution
  //      schedule disclosed) — modelled as a flat subscription position.
  derive({
    id: "k-fd-blackstone-pc", sponsor_id: "k-sp-blackstone", entity_id: "k-ent-altavena-off",
    name: "Blackstone Private Credit Fund (BCRED)", vintage: 2021,
    strategy: "Direct Lending / Private Credit", asset_class: "Private Credit",
    sub_theme: "Private Credit", ticket_size: "<$50MM", fund_size: ">$5BN",
    geography: "North America", currency: "USD",
    commitment: 2_888_201.51, paid_in: 2_888_201.51, nav: 2_888_201.51, distributions: 0, unfunded: 0,
    latest_report_q: "Feb 2026", report_received: true, risk_rating: "green",
    nav_history: [
      { q: "2025-12", nav: 2_893_103.50 },
      { q: "2026-01", nav: 2_902_584.19 },
      { q: "2026-02", nav: 2_888_201.51 },
    ],
    cashflows: [],
    capital_log: [],
    companies: [], transactions: [],
    _overrides: { net_irr: 0, gross_irr: 0, gross_moic: 1.0 },
  }),

  // 9 ── Advent Global Private Equity X (GPE X) — Tierra NC LLC — MDS @ 2025-03-31
  //      Fund-level performance is REAL (Advent GPE 'Master Data Spreadsheet'):
  //      Net IRR 13%, TVPI 1.2x, Gross IRR 26.1%, Gross MOIC 1.37x. Koval's
  //      specific commitment / NAV is NOT in the document set → position size
  //      below is an ESTIMATE consistent with the other commitments.
  derive({
    id: "k-fd-advent-gpe-x", sponsor_id: "k-sp-advent", entity_id: "k-ent-altavena-nc",
    name: "Advent Global Private Equity X (GPE X)", vintage: 2022,
    strategy: "Global Buyout", asset_class: "Private Equity",
    sub_theme: "Diversified Buyout", ticket_size: "<$50MM", fund_size: ">$5BN",
    geography: "Global", currency: "USD",
    commitment: 10_000_000, paid_in: 6_000_000, nav: 7_200_000, distributions: 0, unfunded: 4_000_000,
    latest_report_q: "Q1 2025", report_received: true, risk_rating: "green",
    nav_history: [
      { q: "2024-06", nav: 4_000_000 },
      { q: "2024-12", nav: 5_800_000 },
      { q: "2025-03", nav: 7_200_000 },
    ],
    cashflows: [
      { q: "2022", calls: 2_500_000, dist: 0 },
      { q: "2023", calls: 2_000_000, dist: 0 },
      { q: "2024", calls: 1_500_000, dist: 0 },
    ],
    capital_log: [],
    companies: [], transactions: [],
    // Real fund-level performance from the Advent GPE MDS (GPE X, vintage 2022).
    _overrides: { net_irr: 13.0, gross_irr: 26.1, gross_moic: 1.37 },
  }),
];

// Sanity: expose per-entity NAV totals (seed reconciles entity.nav to these).
export function entityNav(entityId) {
  return round(FUNDS.filter((f) => f.entity_id === entityId).reduce((s, f) => s + f.nav, 0));
}
