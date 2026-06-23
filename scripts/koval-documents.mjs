/**
 * koval-documents.mjs — the document registry for the (anonymised) Altavena
 * portfolio: one Capital Account Statement per fund plus a few capital-call /
 * distribution / report documents, with the extracted fields the Review screen
 * shows.
 *
 * Figures are pulled straight from koval-data.mjs (the funds' real numbers), so
 * the documents can never disagree with the portfolio. Vehicle names are the
 * anonymised entity names — no real client identity is rendered.
 *
 * `source` records which real source PDF each document corresponds to (for the
 * extraction pipeline's provenance); the file actually uploaded to the Vault is
 * a generated, anonymised stand-in (real figures, fictional LP name) so the
 * client's name is never rendered.
 *
 * Imported by seed-documents.mjs.
 */
import { FUNDS } from "./koval-data.mjs";

const byId = Object.fromEntries(FUNDS.map((f) => [f.id, f]));
const F = (n) => `$${Math.round(n).toLocaleString("en-US")}`;
const field = (id, key, value, confidence, page = 1, flagged = false) => ({
  id, key, value, confidence, page, approved: null, flagged,
});

// Per-fund CAS metadata: anonymised vehicle, statement period, received date,
// and the real source filename (provenance only — not uploaded).
const CAS = {
  "k-fd-bain-sse2":     { vehicle: "Altavena NC LLC",       period: "2025-12-31", date: "2026-01-22", src: "Bain Europe SS IICAS_20251231.pdf", status: "Approved",     conf: 96 },
  "k-fd-khosla-viii":   { vehicle: "Altavena NC LLC",       period: "2025-12-31", date: "2026-03-30", src: "Khosla Ventures VIII, L.P. - Q4 _25 CAS.pdf", status: "Approved", conf: 95 },
  "k-fd-chrp-x":        { vehicle: "Altavena NC LLC",       period: "2025-12-31", date: "2026-03-23", src: "CHRP X_4Q2025 CAS.pdf", status: "Needs Review", conf: 84 },
  "k-fd-ngt-ii":        { vehicle: "Altavena PE LLC",       period: "2025-09-30", date: "2025-11-14", src: "NGT II Onshore Feeder Fund, L.P. - 3Q25CAS.pdf", status: "Approved", conf: 97 },
  "k-fd-brep-asia-ii":  { vehicle: "Altavena PE LLC",       period: "2025-09-30", date: "2025-12-15", src: "BREP Asia II Private Investors, LLC - Q3 2025 CAS.pdf", status: "Approved", conf: 93 },
  "k-fd-blackrock-hc":  { vehicle: "Altavena PE LLC",       period: "2025-12-31", date: "2026-02-28", src: "2025.12.31 Account Statement.pdf", status: "Approved",     conf: 94 },
  "k-fd-apollo-x":      { vehicle: "Altavena NC LLC",       period: "2025-12-31", date: "2026-02-15", src: "2025-12-31 Capital Account Statement.pdf", status: "Extracted", conf: 90 },
  "k-fd-blackstone-pc": { vehicle: "Altavena Offshore Ltd", period: "2026-02-28", date: "2026-04-01", src: "Combined Document-2-28-2026.pdf", status: "Approved",     conf: 92 },
  "k-fd-advent-gpe-x":  { vehicle: "Altavena NC LLC",       period: "2025-03-31", date: "2025-05-27", src: "4.2.3 Advent_GPE MDS_Q1 2025.xlsx", status: "Extracted",  conf: 88 },
};

/** Build the extracted-field list for a fund's CAS. The CHRP statement carries
 *  a deliberately low-confidence "Management Fees" field so the Review screen
 *  has a real low-confidence item to verify. */
function casFields(f, meta) {
  const flagged = f.id === "k-fd-chrp-x";
  return [
    field("f1", "Period End", meta.period, 99),
    field("f2", "Net Asset Value (NAV)", F(f.nav), 98),
    field("f3", "Paid-In Capital", F(f.paid_in), 96),
    field("f4", "Total Commitment", F(f.commitment), 99),
    field("f5", "Unfunded Commitment", F(f.unfunded), 93),
    field("f6", "Distributions (ITD)", F(f.distributions), 92),
    field("f7", "Net IRR", `${f.net_irr}%`, flagged ? 71 : 90, 2, flagged),
    field("f8", "Currency", "USD", 100),
  ];
}

// One CAS document per fund, generated from the fund's real figures.
const CAS_DOCS = FUNDS.map((f) => {
  const m = CAS[f.id];
  const fields = casFields(f, m);
  return {
    id: `k-doc-cas-${f.id.replace(/^k-fd-/, "")}`,
    sponsor_id: f.sponsor_id,
    fund_id: f.id,
    direct_id: null,
    name: `${f.name} — Capital Account Statement ${m.period}`,
    doc_type: "Capital Account Statement",
    fund: f.name,
    vehicle: m.vehicle,
    period_end: m.period,
    date: m.date,
    status: m.status,
    confidence: m.conf,
    pages: 1,
    kind: "cas",
    figures: f,           // for the generated PDF
    extracted_fields: fields,
    source: m.src,
  };
});

// A few extra document types so the Vault shows the full lifecycle.
const EXTRA_DOCS = [
  {
    id: "k-doc-call-chrp",
    sponsor_id: "k-sp-crow", fund_id: "k-fd-chrp-x", direct_id: null,
    name: "Crow Holdings Realty Partners X — Capital Call Notice 2025-12-15",
    doc_type: "Capital Call Notice", fund: "Crow Holdings Realty Partners X",
    vehicle: "Altavena NC LLC", period_end: "2025-12-15", date: "2025-12-01",
    status: "Posted", confidence: 97, pages: 1, kind: "call",
    figures: { amount: 633434, due: "2025-12-15", purpose: "Investment Capital" },
    extracted_fields: [
      field("f1", "Due Date", "2025-12-15", 99),
      field("f2", "Capital Called", F(633434), 98),
      field("f3", "Purpose", "Investment Capital", 95),
    ],
    source: "CHRP X LP - Capital Call Notice 12.15.2025.pdf",
  },
  {
    id: "k-doc-dist-bain",
    sponsor_id: "k-sp-bain", fund_id: "k-fd-bain-sse2", direct_id: null,
    name: "Bain Capital Special Situations Europe II — Distribution Notice 2024-10-31",
    doc_type: "Distribution Notice", fund: "Bain Capital Special Situations Europe II",
    vehicle: "Altavena NC LLC", period_end: "2024-10-31", date: "2024-10-31",
    status: "Posted", confidence: 96, pages: 1, kind: "dist",
    figures: { amount: 995747.68, date: "2024-10-31", type: "Recallable" },
    extracted_fields: [
      field("f1", "Payment Date", "2024-10-31", 99),
      field("f2", "Total Distribution", F(995747.68), 97),
      field("f3", "Type", "Return of Recallable Capital", 94),
    ],
    source: "Bain Capital SSE II_Tierra NC LLC_Distribution Notice_31.10.2024.pdf",
  },
  {
    id: "k-doc-report-bain",
    sponsor_id: "k-sp-bain", fund_id: "k-fd-bain-sse2", direct_id: null,
    name: "Bain Capital Special Situations Europe II — Q4 2025 Report",
    doc_type: "Quarterly Report", fund: "Bain Capital Special Situations Europe II",
    vehicle: "Altavena NC LLC", period_end: "2025-12-31", date: "2026-03-02",
    status: "Approved", confidence: 91, pages: 4, kind: "report",
    figures: byId["k-fd-bain-sse2"],
    extracted_fields: [
      field("f1", "Net IRR", "26.3%", 93, 2),
      field("f2", "Net MoM", "1.3x", 92, 2),
      field("f3", "DPI", "0.28x", 90, 2),
    ],
    source: "SSE II Q4-25 Report (1).pdf",
  },
];

export const DOCUMENTS = [...CAS_DOCS, ...EXTRA_DOCS];
