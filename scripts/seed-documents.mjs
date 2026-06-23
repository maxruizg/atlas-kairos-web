#!/usr/bin/env node
/**
 * Seed the (anonymised) Altavena documents into Atlas.
 *
 *   • Generates a real, downloadable PDF per document — anonymised vehicle name
 *     ("Altavena …"), REAL figures from koval-data.mjs. The client's name is
 *     never rendered.
 *   • Uploads each file to the public `documents` Supabase Storage bucket.
 *   • Upserts the document rows (with extracted_fields) into public.documents.
 *
 * Documents attach to the stable k-fd-* / k-sp-* ids the portfolio uses.
 * Run AFTER migration 20260606000000_documents_storage_review.sql (which adds
 * the file_url/extracted_fields/vehicle/period_end columns + the bucket).
 *
 *   cd frontend && npm run seed:docs
 *
 * Reads SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from frontend/.env.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { DOCUMENTS } from "./koval-documents.mjs";

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
const SUPABASE_URL = (env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/\/$/, "");
const SERVICE_KEY = (env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in frontend/.env");
  process.exit(1);
}
const REST = `${SUPABASE_URL}/rest/v1`;
const STORAGE = `${SUPABASE_URL}/storage/v1`;
const AUTH = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` };

const PURPLE = rgb(0.545, 0.482, 0.847);
const INK = rgb(0.12, 0.12, 0.16);
const GREY = rgb(0.45, 0.45, 0.5);

// ── PDF generation (anonymised vehicle, real figures from extracted_fields) ──
async function makeDocPdf(doc) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pageCount = Math.max(1, doc.pages || 1);

  for (let p = 0; p < pageCount; p++) {
    const page = pdf.addPage([595, 842]);
    let y = 792;
    page.drawText("ATLAS  ·  KAIROS", { x: 48, y, size: 10, font: bold, color: PURPLE });
    page.drawText(`Page ${p + 1} of ${pageCount}`, { x: 470, y, size: 9, font, color: GREY });
    y -= 28;
    page.drawText(doc.doc_type, { x: 48, y, size: 20, font: bold, color: INK });
    y -= 18;
    page.drawText(doc.fund, { x: 48, y, size: 11, font, color: GREY });
    y -= 14;
    if (doc.vehicle) { page.drawText(`Limited Partner: ${doc.vehicle}`, { x: 48, y, size: 10, font, color: GREY }); y -= 14; }
    if (doc.period_end) { page.drawText(`Period ending ${doc.period_end}`, { x: 48, y, size: 10, font, color: GREY }); y -= 14; }
    y -= 12;
    page.drawLine({ start: { x: 48, y }, end: { x: 547, y }, thickness: 1, color: PURPLE });
    y -= 26;

    if (p === 0) {
      page.drawText("Summary of extracted values", { x: 48, y, size: 13, font: bold, color: INK });
      y -= 22;
      for (const f of doc.extracted_fields) {
        page.drawText(String(f.key), { x: 56, y, size: 11, font, color: GREY });
        page.drawText(String(f.value), { x: 360, y, size: 11, font: bold, color: INK });
        y -= 20;
        if (y < 90) break;
      }
    } else {
      page.drawText("Continued — management discussion & supplementary detail.", { x: 48, y, size: 10, font, color: INK });
    }
    page.drawText("Confidential — generated anonymised statement for platform testing.", {
      x: 48, y: 40, size: 8, font, color: GREY,
    });
  }
  return await pdf.save();
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
  await fetch(`${STORAGE}/bucket`, {
    method: "POST",
    headers: { ...AUTH, "Content-Type": "application/json" },
    body: JSON.stringify({ id: "documents", name: "documents", public: true }),
  }).catch(() => {});
}

async function upload(path, bytes) {
  const res = await fetch(`${STORAGE}/object/documents/${path}`, {
    method: "POST",
    headers: { ...AUTH, "Content-Type": "application/pdf", "x-upsert": "true" },
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

// Approved/Posted docs are fully reviewed; Extracted/Needs Review keep pending
// fields so the Review screen has work to do.
function applyReviewState(doc) {
  const reviewed = doc.status === "Approved" || doc.status === "Posted";
  return doc.extracted_fields.map((f) => ({ ...f, approved: reviewed ? true : null }));
}

// ── main ─────────────────────────────────────────────────────────────────────
async function main() {
  const org = await resolveOrg();
  console.log("Seeding Altavena documents →", SUPABASE_URL, "\n  org:", org);
  await ensureBucket();

  const rows = [];
  for (const doc of DOCUMENTS) {
    const bytes = await makeDocPdf(doc);
    const path = `${org}/${doc.id}.pdf`;
    const file_url = await upload(path, bytes);
    const fields = applyReviewState(doc);
    rows.push({
      id: doc.id,
      organization_id: org,
      sponsor_id: doc.sponsor_id ?? null,
      fund_id: doc.fund_id ?? null,
      direct_id: doc.direct_id ?? null,
      name: doc.name,
      doc_type: doc.doc_type,
      fund: doc.fund,
      status: doc.status,
      confidence: doc.confidence,
      date: doc.date,
      size: sizeOf(bytes),
      fields: fields.length,
      extracted: fields.filter((f) => f.approved !== null).length,
      file_url,
      storage_path: `documents/${path}`,
      pages: doc.pages ?? 1,
      extracted_fields: fields,
      vehicle: doc.vehicle ?? null,
      period_end: doc.period_end ?? null,
    });
    console.log("  ✓ uploaded", doc.id, `(${doc.status})`);
  }

  await upsertDocs(rows);
  const needsReview = rows.filter((r) => r.status === "Needs Review").length;
  console.log(`\nSeeded ${rows.length} documents into public.documents + the documents bucket. (${needsReview} need review)`);
}

main().catch((e) => {
  console.error("Seed docs failed:", e.message);
  process.exit(1);
});
