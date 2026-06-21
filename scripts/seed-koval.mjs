/**
 * Seed the Koval portfolio into Supabase from REAL data pulled from the family
 * office's Capital Account Statements / portfolio tracker (Google Drive):
 *
 *   • Bain Capital Special Situations Europe II   (Bain Capital,  PE / Special Sit.)
 *   • Khosla Ventures VIII                         (Khosla Ventures, Venture Capital)
 *   • Crow Holdings Realty Partners X (CHRP X)     (Crow Holdings,  Real Assets)
 *
 * All held through the LP vehicle **Tierra NC LLC**. Figures are the real
 * commitment / called / NAV / distribution numbers as of the latest statement
 * (Q3–Q4 2025). Capital-call dates for CHRP X are the actual notice dates.
 *
 * Idempotent: every row uses a stable `k-…` id and is upserted on its primary
 * key, so re-running refreshes the numbers without creating duplicates.
 *
 *   cd frontend && npm run seed:koval
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── env ─────────────────────────────────────────────────────────────────────
function loadEnv() {
  const out = { ...process.env };
  try {
    const raw = readFileSync(join(__dirname, "..", ".env"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !out[m[1]]) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    /* no .env file — rely on process.env */
  }
  return out;
}
const env = loadEnv();
const SUPABASE_URL = (env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || "";
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in frontend/.env");
  process.exit(1);
}
const REST = `${SUPABASE_URL}/rest/v1`;
const headers = (extra = {}) => ({
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
  ...extra,
});

async function rest(path, init = {}) {
  const res = await fetch(`${REST}${path}`, { ...init, headers: headers(init.headers) });
  const text = await res.text();
  if (!res.ok) throw new Error(`${init.method || "GET"} ${path} → ${res.status}: ${text}`);
  return text ? JSON.parse(text) : undefined;
}

/** Upsert rows on their primary key (id). */
async function upsert(table, rows) {
  await rest(`/${table}?on_conflict=id`, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(rows),
  });
  console.log(`  ✓ ${table}: upserted ${rows.length}`);
}

async function resolveOrgId() {
  const onboarded = await rest(`/organizations?onboarded=eq.true&select=id&order=created_at.asc&limit=1`);
  if (onboarded?.[0]?.id) return onboarded[0].id;
  const any = await rest(`/organizations?select=id&limit=1`);
  if (any?.[0]?.id) return any[0].id;
  throw new Error("No organization found in Supabase — onboard a tenant first.");
}

// ── helpers ──────────────────────────────────────────────────────────────────
const MM = 1_000_000;
const round = (n) => Math.round(n * 100) / 100;
/** Derived ratios from the raw capital figures. */
function derive(f) {
  const pct_called = f.commitment > 0 ? (f.paid_in / f.commitment) * 100 : 0;
  const tvpi = f.paid_in > 0 ? (f.distributions + f.nav) / f.paid_in : 0;
  const dpi = f.paid_in > 0 ? f.distributions / f.paid_in : 0;
  const rvpi = f.paid_in > 0 ? f.nav / f.paid_in : 0;
  return { ...f, pct_called: round(pct_called), tvpi: round(tvpi), dpi: round(dpi), rvpi: round(rvpi) };
}

// ── data (REAL figures, raw USD) ──────────────────────────────────────────────
const ORG_HOLDER = "Tierra NC LLC";

const ENTITY = {
  id: "k-ent-tierra",
  name: "Tierra NC LLC",
  short: "TIERRA",
  nav: round(2_934_573 + 2_011_767 + 5_532_645),
  entity_type: "LLC",
  jurisdiction_country: "United States",
  status: "Active",
  base_currency: "USD",
};

const SPONSORS = [
  { id: "k-sp-bain", name: "Bain Capital", initials: "BC", country: "United States", color: "#C0392B", asset_classes: ["Private Equity"] },
  { id: "k-sp-khosla", name: "Khosla Ventures", initials: "KV", country: "United States", color: "#8B7BD8", asset_classes: ["Venture Capital"] },
  { id: "k-sp-crow", name: "Crow Holdings Capital", initials: "CH", country: "United States", color: "#D8A14A", asset_classes: ["Real Assets"] },
];

const FUNDS = [
  derive({
    id: "k-fd-bain-sse2",
    sponsor_id: "k-sp-bain",
    entity_id: ENTITY.id,
    name: "Bain Capital Special Situations Europe II",
    vintage: 2023,
    strategy: "Distressed / Special Situations",
    asset_class: "Private Equity",
    sub_theme: "Decoupling of Supply Chains",
    ticket_size: "<$50MM",
    fund_size: "$1-5BN",
    geography: "Europe",
    currency: "USD",
    commitment: 10_000_000,
    paid_in: 2_600_000,
    nav: 2_934_573,
    distributions: 0,
    unfunded: 7_400_000,
    gross_irr: 12.0,
    net_irr: 9.0,
    gross_moic: 1.2,
    net_moic: 1.13,
    latest_report_q: "Q3 2025",
    report_received: true,
    risk_rating: "green",
    nav_history: [
      { q: "2023", nav: 0 },
      { q: "2024", nav: 1_000_000 },
      { q: "2025", nav: 2_934_573 },
    ],
    cashflows: [
      { q: "2023", calls: 500_000, dist: 0 },
      { q: "2024", calls: 500_000, dist: 0 },
      { q: "2025", calls: 1_600_000, dist: 0 },
    ],
    capital_log: [
      { date: "2023-11-15", type: "call", amount: 500_000, note: "Initial drawdown" },
      { date: "2024-06-30", type: "call", amount: 500_000 },
      { date: "2025-03-31", type: "call", amount: 1_000_000 },
      { date: "2025-09-30", type: "call", amount: 600_000, note: "Q3 2025 call" },
    ],
    companies: [],
    transactions: [],
  }),
  derive({
    id: "k-fd-khosla-viii",
    sponsor_id: "k-sp-khosla",
    entity_id: ENTITY.id,
    name: "Khosla Ventures VIII",
    vintage: 2023,
    strategy: "Seed",
    asset_class: "Venture Capital",
    sub_theme: "Disruptive Technologies",
    ticket_size: "<$50MM",
    fund_size: "$1-5BN",
    geography: "North America",
    currency: "USD",
    commitment: 2_000_000,
    paid_in: 1_382_000,
    nav: 2_011_767,
    distributions: 0,
    unfunded: 618_000,
    gross_irr: 24.0,
    net_irr: 18.0,
    gross_moic: 1.55,
    net_moic: 1.46,
    latest_report_q: "Q4 2025",
    report_received: true,
    risk_rating: "green",
    nav_history: [
      { q: "2023", nav: 0 },
      { q: "2024", nav: 871_197 },
      { q: "2025", nav: 2_011_767 },
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
    companies: [],
    transactions: [],
  }),
  derive({
    id: "k-fd-chrp-x",
    sponsor_id: "k-sp-crow",
    entity_id: ENTITY.id,
    name: "Crow Holdings Realty Partners X",
    vintage: 2023,
    strategy: "Value Add",
    asset_class: "Real Assets",
    sub_theme: "Demographics & Housing",
    ticket_size: "<$50MM",
    fund_size: "$1-5BN",
    geography: "North America",
    currency: "USD",
    commitment: 10_000_000,
    paid_in: 6_525_021,
    nav: 5_532_645,
    distributions: 0,
    unfunded: 3_474_979,
    gross_irr: -5.0,
    net_irr: -6.81, // real, from the tracker
    gross_moic: 0.9,
    net_moic: 0.85, // real
    latest_report_q: "Q3 2025",
    report_received: true,
    risk_rating: "yellow",
    nav_history: [
      { q: "2023", nav: 0 },
      { q: "2024", nav: 2_900_000 },
      { q: "2025", nav: 5_532_645 },
    ],
    cashflows: [
      { q: "2024", calls: 3_492_433, dist: 0 },
      { q: "2025", calls: 3_032_588, dist: 0 },
    ],
    // Real dated capital calls from the CHRP X capital log.
    capital_log: [
      { date: "2024-03-20", type: "call", amount: 2_150_011, note: "Investment Capital" },
      { date: "2024-09-19", type: "call", amount: 710_376, note: "Investment Capital" },
      { date: "2024-12-20", type: "call", amount: 632_046, note: "Investment Capital" },
      { date: "2025-03-14", type: "call", amount: 853_898, note: "Investment Capital" },
      { date: "2025-05-21", type: "call", amount: 502_404, note: "Investment Capital" },
      { date: "2025-07-24", type: "call", amount: 659_452, note: "Investment Capital" },
      { date: "2025-09-11", type: "call", amount: 383_400, note: "Investment Capital" },
      { date: "2025-12-01", type: "call", amount: 633_434, note: "Investment Capital" },
    ],
    // Top underlying properties (fund-level FMV, $MM → raw USD).
    companies: [
      { name: "Moore Portfolio", theme: "Demographics & Housing", stage: null, date: "2023-11-05", status: "Active", invested: round(290.2 * MM), fmv: round(327.4 * MM), moic: 1.13, irr: 0, own: 0 },
      { name: "Otay Business Park", theme: "Infrastructure & Energy", stage: null, date: "2022-05-24", status: "Active", invested: round(98.5 * MM), fmv: round(138.4 * MM), moic: 1.41, irr: 0, own: 0 },
      { name: "Valentine Commons", theme: "Demographics & Housing", stage: null, date: "2022-09-30", status: "Active", invested: round(54.0 * MM), fmv: round(76.5 * MM), moic: 1.42, irr: 0, own: 0 },
      { name: "Trace Midtown", theme: "Demographics & Housing", stage: null, date: "2025-08-01", status: "Active", invested: round(38.4 * MM), fmv: round(97.2 * MM), moic: 2.53, irr: 0, own: 0 },
      { name: "Rialto-Lilac", theme: "Infrastructure & Energy", stage: null, date: "2022-06-23", status: "Active", invested: round(48.4 * MM), fmv: round(68.1 * MM), moic: 1.41, irr: 0, own: 0 },
    ],
    transactions: [],
  }),
];

// A few document metadata rows so the Vault / Review / header badge have real
// content. (No file_url — the actual PDFs live in the family office's Drive.)
const DOCUMENTS = [
  { id: "k-doc-khosla-cas", name: "Khosla Ventures VIII — Q4'25 CAS", doc_type: "Capital Account Statement", fund: "Khosla Ventures VIII", status: "Needs Review", confidence: 92, date: "2026-03-30", size: "240 KB", fields: 6, extracted: 0, sponsor_id: "k-sp-khosla", fund_id: "k-fd-khosla-viii", vehicle: ORG_HOLDER, period_end: "2025-12-31" },
  { id: "k-doc-bain-cas", name: "Bain SSE II — Q3'25 CAS", doc_type: "Capital Account Statement", fund: "Bain Capital Special Situations Europe II", status: "Approved", confidence: 95, date: "2025-11-25", size: "210 KB", fields: 7, extracted: 7, sponsor_id: "k-sp-bain", fund_id: "k-fd-bain-sse2", vehicle: ORG_HOLDER, period_end: "2025-09-30" },
  { id: "k-doc-chrp-call", name: "CHRP X — Capital Call (Dec 2025)", doc_type: "Quarterly Report", fund: "Crow Holdings Realty Partners X", status: "Posted", confidence: 88, date: "2025-12-01", size: "180 KB", fields: 5, extracted: 5, sponsor_id: "k-sp-crow", fund_id: "k-fd-chrp-x", vehicle: ORG_HOLDER, period_end: "2025-09-30" },
];

// ── run ───────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`Seeding Koval portfolio → ${SUPABASE_URL}`);
  const orgId = await resolveOrgId();
  console.log(`  org: ${orgId}`);

  await upsert("entities", [{ ...ENTITY, organization_id: orgId }]);
  await upsert("sponsors", SPONSORS.map((s) => ({ ...s, organization_id: orgId })));
  await upsert("funds", FUNDS.map((f) => ({ ...f, organization_id: orgId })));
  // Documents: this DB's `documents` table may predate the storage/review
  // migration, so only send columns guaranteed to exist on the base schema.
  // (file_url/extracted_fields/vehicle/period_end light up once 20260606 runs.)
  const DOC_COLS = ["id", "name", "doc_type", "fund", "status", "confidence", "date", "size", "fields", "extracted", "sponsor_id", "fund_id"];
  try {
    const rows = DOCUMENTS.map((d) => {
      const r = { organization_id: orgId };
      for (const k of DOC_COLS) r[k] = d[k];
      return r;
    });
    await upsert("documents", rows);
  } catch (e) {
    console.warn(`  ⚠ documents skipped: ${String(e.message).split("\n")[0]}`);
  }

  // Keep the entity NAV in sync with the funds we just wrote.
  const navTotal = round(FUNDS.reduce((a, f) => a + f.nav, 0));
  await rest(`/entities?id=eq.${ENTITY.id}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ nav: navTotal }),
  });

  console.log(`Done. 1 entity · ${SPONSORS.length} sponsors · ${FUNDS.length} funds · ${DOCUMENTS.length} docs. Portfolio NAV $${navTotal.toLocaleString()}.`);
}

main().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
