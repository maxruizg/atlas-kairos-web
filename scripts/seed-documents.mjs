#!/usr/bin/env node
/**
 * Seed real, downloadable documents into Atlas.
 *
 *   • Generates real PDF / XLSX files (pdf-lib + exceljs).
 *   • Uploads them to the public `documents` Supabase Storage bucket.
 *   • Upserts the metadata rows into public.documents (idempotent on id).
 *
 * Docs attach to the STABLE client-seed ids the UI renders (f-seed-*,
 * s-seed-*, d-seed-*). Run AFTER applying migration
 * 20260606000000_documents_storage_review.sql (which creates the bucket).
 *
 *   cd frontend && npm run seed:docs
 *
 * Reads SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from frontend/.env.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import ExcelJS from "exceljs";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── env ────────────────────────────────────────────────────────────────────
function loadEnv() {
  const envPath = resolve(__dirname, "..", ".env");
  const out = {};
  try {
    for (const line of readFileSync(envPath, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    /* fall back to process.env */
  }
  return { ...out, ...process.env };
}

const env = loadEnv();
const SUPABASE_URL = (env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || "";
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in frontend/.env");
  process.exit(1);
}
const REST = `${SUPABASE_URL}/rest/v1`;
const STORAGE = `${SUPABASE_URL}/storage/v1`;
const AUTH = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
};

const PURPLE = rgb(0.545, 0.482, 0.847);
const INK = rgb(0.12, 0.12, 0.16);
const GREY = rgb(0.45, 0.45, 0.5);

// ── PDF helpers ──────────────────────────────────────────────────────────────
async function makePdf({ title, vehicle, period, pageSpecs }) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  for (let p = 0; p < pageSpecs.length; p++) {
    const page = pdf.addPage([595, 842]);
    let y = 792;
    // Brand header
    page.drawText("ATLAS  ·  KAIROS", { x: 48, y, size: 10, font: bold, color: PURPLE });
    page.drawText(`Page ${p + 1} of ${pageSpecs.length}`, { x: 470, y, size: 9, font, color: GREY });
    y -= 28;
    page.drawText(title, { x: 48, y, size: 20, font: bold, color: INK });
    y -= 18;
    if (vehicle) {
      page.drawText(vehicle, { x: 48, y, size: 11, font, color: GREY });
      y -= 14;
    }
    if (period) {
      page.drawText(`Period ending ${period}`, { x: 48, y, size: 10, font, color: GREY });
      y -= 14;
    }
    y -= 12;
    page.drawLine({ start: { x: 48, y }, end: { x: 547, y }, thickness: 1, color: PURPLE });
    y -= 26;

    const spec = pageSpecs[p];
    if (spec.heading) {
      page.drawText(spec.heading, { x: 48, y, size: 13, font: bold, color: INK });
      y -= 22;
    }
    for (const row of spec.rows || []) {
      if (Array.isArray(row)) {
        page.drawText(String(row[0]), { x: 56, y, size: 11, font, color: GREY });
        page.drawText(String(row[1]), { x: 360, y, size: 11, font: bold, color: INK });
        y -= 20;
      } else {
        // paragraph
        const words = String(row).split(" ");
        let line = "";
        for (const w of words) {
          if ((line + " " + w).length > 80) {
            page.drawText(line, { x: 48, y, size: 10, font, color: INK });
            y -= 15;
            line = w;
          } else line = line ? `${line} ${w}` : w;
        }
        if (line) {
          page.drawText(line, { x: 48, y, size: 10, font, color: INK });
          y -= 15;
        }
        y -= 6;
      }
      if (y < 70) break;
    }
    page.drawText("Confidential — for the named limited partner only.", {
      x: 48, y: 40, size: 8, font, color: GREY,
    });
  }
  return await pdf.save();
}

function casPages(d) {
  return [
    {
      heading: "Capital Account Statement",
      rows: [
        ["Net Asset Value (NAV)", d.nav],
        ["Paid-In Capital", d.paidIn],
        ["Unfunded Commitment", d.unfunded],
        ["Distributions YTD", d.dist],
        ["Management Fees YTD", d.fees],
        ["Total Commitment", d.commitment],
        ["Currency", d.currency],
        ["Vehicle", d.vehicle],
      ],
    },
  ];
}

function quarterlyPages(d) {
  return [
    { heading: "1. Portfolio Summary", rows: [
      "This quarterly report summarises the performance and key activity of the fund for the period.",
      ["NAV", d.nav], ["Paid-In", d.paidIn], ["Distributions YTD", d.dist],
    ]},
    { heading: "2. Performance", rows: [
      ["Net IRR", d.netIrr], ["Gross IRR", d.grossIrr], ["TVPI", d.tvpi], ["DPI", d.dpi], ["MOIC (net)", d.moic],
    ]},
    { heading: "3. Key Updates", rows: [
      "Capital deployment proceeded in line with the pacing model. Two portfolio positions were marked up following new financing rounds, and one distribution was processed during the quarter.",
      "Reserves remain adequate to support follow-on commitments through the next twelve months.",
    ]},
    { heading: "4. Outlook", rows: [
      "The General Partner maintains a constructive outlook for the strategy. Pipeline activity remains healthy across the target geographies and the team continues to prioritise capital discipline.",
    ]},
  ];
}

function annualPages(d) {
  return [
    { heading: "Annual Report — Overview", rows: [
      "This annual report presents the audited results and strategic review of the fund for the financial year.",
      ["NAV", d.nav], ["Paid-In", d.paidIn], ["Distributions (cumulative)", d.dist],
    ]},
    { heading: "Performance", rows: [
      ["Net IRR", d.netIrr], ["Gross IRR", d.grossIrr], ["TVPI", d.tvpi], ["DPI", d.dpi], ["RVPI", d.rvpi],
    ]},
    { heading: "Portfolio Review", rows: [
      "The portfolio demonstrated resilience across market conditions. Realisations were achieved at valuations consistent with prior carrying marks.",
    ]},
    { heading: "Risk & Compliance", rows: [
      "All regulatory filings were completed on schedule. The risk framework was reviewed and no material exceptions were identified.",
    ]},
    { heading: "Audited Financials", rows: [
      ["Total Assets", d.nav], ["Total Commitments", d.commitment], ["Unfunded", d.unfunded],
    ]},
    { heading: "Investor Notices", rows: [
      "No changes to fund terms occurred during the period. The next annual meeting will be scheduled in the following quarter.",
    ]},
  ];
}

async function makeCapitalLogXlsx(d, capitalLog) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Atlas by Kairos";
  const ws = wb.addWorksheet("Capital Log");
  ws.columns = [
    { header: "Entity", key: "entity", width: 26 },
    { header: "Commitment", key: "commitment", width: 16 },
    { header: "Currency", key: "currency", width: 10 },
    { header: "Investment Date", key: "date", width: 16 },
    { header: "Contribution", key: "contribution", width: 16 },
    { header: "Cumulative", key: "cumulative", width: 16 },
    { header: "Unfunded Balance", key: "unfunded", width: 18 },
    { header: "Distribution", key: "distribution", width: 16 },
  ];
  ws.getRow(1).font = { bold: true };
  const commitment = d.commitmentNum;
  let cumulative = 0;
  for (const e of capitalLog) {
    const contribution = e.type === "call" ? e.amount : 0;
    const distribution = e.type === "distribution" ? e.amount : 0;
    cumulative += contribution;
    ws.addRow({
      entity: d.vehicle,
      commitment,
      currency: d.currency,
      date: e.date,
      contribution,
      cumulative,
      unfunded: Math.max(0, commitment - cumulative),
      distribution,
    });
  }
  const summary = wb.addWorksheet("Summary");
  summary.addRow(["Fund", d.vehicle]);
  summary.addRow(["Commitment", commitment]);
  summary.addRow(["Cumulative Paid-In", cumulative]);
  summary.addRow(["Unfunded Balance", Math.max(0, commitment - cumulative)]);
  const buf = await wb.xlsx.writeBuffer();
  return new Uint8Array(buf);
}

// ── Supabase helpers ─────────────────────────────────────────────────────────
async function resolveOrg() {
  let r = await fetch(`${REST}/organizations?onboarded=eq.true&select=id&order=created_at.asc&limit=1`, { headers: AUTH });
  let rows = await r.json();
  if (!rows?.[0]) {
    r = await fetch(`${REST}/organizations?select=id&order=created_at.asc&limit=1`, { headers: AUTH });
    rows = await r.json();
  }
  if (!rows?.[0]?.id) throw new Error("No organization found in Supabase.");
  return rows[0].id;
}

async function ensureBucket() {
  // Idempotent: migration usually creates it, but make sure for fresh dbs.
  await fetch(`${STORAGE}/bucket`, {
    method: "POST",
    headers: { ...AUTH, "Content-Type": "application/json" },
    body: JSON.stringify({ id: "documents", name: "documents", public: true }),
  }).catch(() => {});
}

async function upload(path, bytes, contentType) {
  const res = await fetch(`${STORAGE}/object/documents/${path}`, {
    method: "POST",
    headers: { ...AUTH, "Content-Type": contentType, "x-upsert": "true" },
    body: bytes,
  });
  if (!res.ok) throw new Error(`upload ${path}: ${res.status} ${await res.text()}`);
  return `${SUPABASE_URL}/storage/v1/object/public/documents/${path}`;
}

async function upsertDocs(rows) {
  const res = await fetch(`${REST}/documents?on_conflict=id`, {
    method: "POST",
    headers: { ...AUTH, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`upsert documents: ${res.status} ${await res.text()}`);
}

function sizeOf(bytes) {
  const b = bytes.byteLength ?? bytes.length;
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

const F = (n) => `$${n.toLocaleString("en-US")}`;
const field = (id, key, value, confidence, page = 1, flagged = false) => ({
  id, key, value, confidence, page, approved: null, flagged,
});

// ── Fund display data (mirrors seed.ts, raw dollars) ─────────────────────────
const ANDES = {
  vehicle: "Andes Direct Lending Fund II, L.P.", currency: "USD", commitmentNum: 25_000_000,
  nav: F(19_800_000), paidIn: F(18_500_000), unfunded: F(6_500_000), dist: F(4_200_000),
  fees: F(312_500), commitment: F(25_000_000),
  netIrr: "9.8%", grossIrr: "12.4%", tvpi: "1.30x", dpi: "0.23x", rvpi: "1.07x", moic: "1.3x",
};
const PAMPA = {
  vehicle: "Pampa Energy Transition Fund I, L.P.", currency: "USD", commitmentNum: 40_000_000,
  nav: F(52_000_000), paidIn: F(36_000_000), unfunded: F(4_000_000), dist: F(14_000_000),
  fees: F(600_000), commitment: F(40_000_000),
  netIrr: "15.2%", grossIrr: "18.5%", tvpi: "1.83x", dpi: "0.39x", rvpi: "1.44x", moic: "1.7x",
};
const ANDES_LOG = [
  { date: "2021-03-15", type: "call", amount: 8_000_000 },
  { date: "2022-02-10", type: "call", amount: 6_000_000 },
  { date: "2022-11-30", type: "distribution", amount: 1_200_000 },
  { date: "2023-06-20", type: "call", amount: 4_500_000 },
  { date: "2024-01-15", type: "distribution", amount: 3_000_000 },
];

// ── main ─────────────────────────────────────────────────────────────────────
async function main() {
  const org = await resolveOrg();
  console.log("Org:", org);
  await ensureBucket();

  const docs = [];
  const queue = []; // { id, ext, contentType, bytes, meta }

  function add(id, ext, contentType, bytes, meta) {
    queue.push({ id, ext, contentType, bytes });
    docs.push({ id, ext, ...meta });
  }

  // ── Andes fund docs ──
  add("doc-cas-andes-ii", "pdf", "application/pdf",
    await makePdf({ title: "Capital Account Statement", vehicle: ANDES.vehicle, period: "2026-03-31", pageSpecs: casPages(ANDES) }),
    { sponsor_id: "s-seed-andes", fund_id: "f-seed-andes-credit-ii", name: "Andes Fund II — Capital Account Statement Q1 2026",
      doc_type: "Capital Account Statement", fund: "Andes Direct Lending Fund II", status: "Approved", confidence: 98,
      date: "2026-04-12", pages: 1, vehicle: ANDES.vehicle, period_end: "2026-03-31",
      extracted_fields: [
        field("f1", "NAV", ANDES.nav, 99), field("f2", "Paid-In Capital", ANDES.paidIn, 98),
        field("f3", "Unfunded", ANDES.unfunded, 97), field("f4", "Distributions YTD", ANDES.dist, 96),
        field("f5", "Management Fees", ANDES.fees, 92), field("f6", "Currency", ANDES.currency, 100),
      ] });

  add("doc-qr-andes-ii", "pdf", "application/pdf",
    await makePdf({ title: "Quarterly Report", vehicle: ANDES.vehicle, period: "2026-03-31", pageSpecs: quarterlyPages(ANDES) }),
    { sponsor_id: "s-seed-andes", fund_id: "f-seed-andes-credit-ii", name: "Andes Fund II — Quarterly Report Q1 2026",
      doc_type: "Quarterly Report", fund: "Andes Direct Lending Fund II", status: "Extracted", confidence: 91,
      date: "2026-04-15", pages: 4, vehicle: ANDES.vehicle, period_end: "2026-03-31",
      extracted_fields: [ field("f1", "Net IRR", ANDES.netIrr, 95, 2), field("f2", "TVPI", ANDES.tvpi, 94, 2) ] });

  add("doc-ar-andes-ii", "pdf", "application/pdf",
    await makePdf({ title: "Annual Report 2025", vehicle: ANDES.vehicle, period: "2025-12-31", pageSpecs: annualPages(ANDES) }),
    { sponsor_id: "s-seed-andes", fund_id: "f-seed-andes-credit-ii", name: "Andes Fund II — Annual Report 2025",
      doc_type: "Annual Report", fund: "Andes Direct Lending Fund II", status: "Approved", confidence: 97,
      date: "2026-02-28", pages: 6, vehicle: ANDES.vehicle, period_end: "2025-12-31", extracted_fields: [] });

  // ── Pampa fund docs (CAS is the Needs Review one) ──
  add("doc-cas-pampa-i", "pdf", "application/pdf",
    await makePdf({ title: "Capital Account Statement", vehicle: PAMPA.vehicle, period: "2026-03-31", pageSpecs: casPages(PAMPA) }),
    { sponsor_id: "s-seed-pampa", fund_id: "f-seed-pampa-infra-i", name: "Pampa Fund I — Capital Account Statement Q1 2026",
      doc_type: "Capital Account Statement", fund: "Pampa Energy Transition Fund I", status: "Needs Review", confidence: 84,
      date: "2026-04-10", pages: 1, vehicle: PAMPA.vehicle, period_end: "2026-03-31",
      extracted_fields: [
        field("f1", "NAV", PAMPA.nav, 97), field("f2", "Paid-In Capital", PAMPA.paidIn, 95),
        field("f3", "Unfunded", PAMPA.unfunded, 96), field("f4", "Distributions YTD", PAMPA.dist, 90),
        field("f5", "Management Fees", PAMPA.fees, 71, 4, true), field("f6", "Currency", PAMPA.currency, 100),
      ] });

  add("doc-qr-pampa-i", "pdf", "application/pdf",
    await makePdf({ title: "Quarterly Report", vehicle: PAMPA.vehicle, period: "2026-03-31", pageSpecs: quarterlyPages(PAMPA) }),
    { sponsor_id: "s-seed-pampa", fund_id: "f-seed-pampa-infra-i", name: "Pampa Fund I — Quarterly Report Q1 2026",
      doc_type: "Quarterly Report", fund: "Pampa Energy Transition Fund I", status: "Extracted", confidence: 89,
      date: "2026-04-18", pages: 4, vehicle: PAMPA.vehicle, period_end: "2026-03-31",
      extracted_fields: [ field("f1", "Net IRR", PAMPA.netIrr, 93, 2), field("f2", "DPI", PAMPA.dpi, 92, 2) ] });

  add("doc-ar-pampa-i", "pdf", "application/pdf",
    await makePdf({ title: "Annual Report 2025", vehicle: PAMPA.vehicle, period: "2025-12-31", pageSpecs: annualPages(PAMPA) }),
    { sponsor_id: "s-seed-pampa", fund_id: "f-seed-pampa-infra-i", name: "Pampa Fund I — Annual Report 2025",
      doc_type: "Annual Report", fund: "Pampa Energy Transition Fund I", status: "Approved", confidence: 96,
      date: "2026-03-01", pages: 6, vehicle: PAMPA.vehicle, period_end: "2025-12-31", extracted_fields: [] });

  // ── Excel Capital Log (Andes) ──
  add("doc-xlsx-andes-capital-log", "xlsx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    await makeCapitalLogXlsx(ANDES, ANDES_LOG),
    { sponsor_id: "s-seed-andes", fund_id: "f-seed-andes-credit-ii", name: "Andes Fund II — Capital Log",
      doc_type: "Capital Log (Excel)", fund: "Andes Direct Lending Fund II", status: "Approved", confidence: 100,
      date: "2026-04-12", pages: 1, vehicle: ANDES.vehicle, period_end: "2026-03-31", extracted_fields: [] });

  // ── Sponsor-level overviews ──
  add("doc-sponsor-andes-overview", "pdf", "application/pdf",
    await makePdf({ title: "GP Overview", vehicle: "Andes Capital Partners", period: null,
      pageSpecs: [{ heading: "General Partner Overview", rows: [
        "Andes Capital Partners is a México-based private credit manager focused on direct lending across Latin America.",
        ["Headquarters", "México"], ["Strategy", "Private Credit — Direct Lending"], ["Funds", "1"],
      ]}] }),
    { sponsor_id: "s-seed-andes", fund_id: null, name: "Andes Capital — GP Overview",
      doc_type: "Sponsor Overview", fund: "Andes Capital Partners", status: "Approved", confidence: 99,
      date: "2026-01-20", pages: 1, vehicle: null, period_end: null, extracted_fields: [] });

  add("doc-sponsor-pampa-overview", "pdf", "application/pdf",
    await makePdf({ title: "GP Overview", vehicle: "Pampa Infrastructure", period: null,
      pageSpecs: [{ heading: "General Partner Overview", rows: [
        "Pampa Infrastructure is a Brazil-based infrastructure manager focused on the energy transition.",
        ["Headquarters", "Brasil"], ["Strategy", "Infrastructure — Greenfield"], ["Funds", "1"],
      ]}] }),
    { sponsor_id: "s-seed-pampa", fund_id: null, name: "Pampa Infrastructure — GP Overview",
      doc_type: "Sponsor Overview", fund: "Pampa Infrastructure", status: "Approved", confidence: 99,
      date: "2026-01-22", pages: 1, vehicle: null, period_end: null, extracted_fields: [] });

  // ── Direct-investment docs ──
  add("doc-deck-clip", "pdf", "application/pdf",
    await makePdf({ title: "Investor Deck", vehicle: "Clip (Payclip)", period: null,
      pageSpecs: [
        { heading: "Company Overview", rows: ["Clip is a leading México payments company.", ["Sector", "Fintech"], ["Stage", "Growth"], ["Ownership", "3.1%"]] },
        { heading: "Traction", rows: [["Latest Valuation", F(11_200_000)], ["Entry", F(5_000_000)], ["MOIC", "2.24x"]] },
      ] }),
    { sponsor_id: null, fund_id: null, direct_id: "d-seed-0", name: "Clip — Investor Deck",
      doc_type: "Pitch Deck", fund: "Clip (Payclip)", status: "Extracted", confidence: 88,
      date: "2025-12-31", pages: 2, vehicle: null, period_end: null,
      extracted_fields: [ field("f1", "Valuation", F(11_200_000), 90), field("f2", "Ownership", "3.1%", 95) ] });

  add("doc-captable-nowports", "xlsx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    await (async () => {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Cap Table");
      ws.columns = [
        { header: "Holder", key: "holder", width: 28 },
        { header: "Shares", key: "shares", width: 14 },
        { header: "Ownership %", key: "pct", width: 14 },
      ];
      ws.getRow(1).font = { bold: true };
      ws.addRow({ holder: "Founders", shares: 4_000_000, pct: 40 });
      ws.addRow({ holder: "Family Office (us)", shares: 280_000, pct: 2.8 });
      ws.addRow({ holder: "Other Investors", shares: 5_720_000, pct: 57.2 });
      return new Uint8Array(await wb.xlsx.writeBuffer());
    })(),
    { sponsor_id: null, fund_id: null, direct_id: "d-seed-2", name: "Nowports — Cap Table",
      doc_type: "Cap Table (Excel)", fund: "Nowports", status: "Approved", confidence: 100,
      date: "2025-12-31", pages: 1, vehicle: null, period_end: null, extracted_fields: [] });

  // ── upload + assemble rows ──
  const rows = [];
  for (const item of queue) {
    const path = `${org}/${item.id}.${item.ext}`;
    const file_url = await upload(path, item.bytes, item.contentType);
    const meta = docs.find((d) => d.id === item.id);
    rows.push({
      id: item.id,
      organization_id: org,
      sponsor_id: meta.sponsor_id ?? null,
      fund_id: meta.fund_id ?? null,
      direct_id: meta.direct_id ?? null,
      name: meta.name,
      doc_type: meta.doc_type,
      fund: meta.fund,
      status: meta.status,
      confidence: meta.confidence,
      date: meta.date,
      size: sizeOf(item.bytes),
      fields: (meta.extracted_fields || []).length,
      extracted: (meta.extracted_fields || []).filter((f) => f.approved !== null).length,
      file_url,
      storage_path: `documents/${path}`,
      pages: meta.pages ?? 1,
      extracted_fields: meta.extracted_fields || [],
      vehicle: meta.vehicle ?? null,
      period_end: meta.period_end ?? null,
    });
    console.log("uploaded", item.id);
  }

  await upsertDocs(rows);
  console.log(`\nSeeded ${rows.length} documents into public.documents + the documents bucket.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
