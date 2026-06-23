#!/usr/bin/env node
/**
 * Atlas document-extraction pipeline (real AI).
 *
 * Sends each client PDF to Claude (native PDF support) and extracts structured
 * fields via a constrained JSON schema (structured outputs). One JSON file per
 * document is written to scripts/extract/output/ (gitignored — the raw output
 * carries the real client name).
 *
 * This is the reusable "AI extraction" artifact. The portfolio + Vault seeds
 * were authored from a manual read of these same documents, so the platform
 * works without running this; run this to (re)generate extractions with a live
 * model, or to process new documents.
 *
 *   ANTHROPIC_API_KEY=sk-ant-... node scripts/extract/extract.mjs [--force] [glob]
 *
 * Requires: npm i -D @anthropic-ai/sdk   (added to package.json devDependencies)
 *
 * Docs followed: claude-api skill — @anthropic-ai/sdk, claude-opus-4-8,
 * `document` content block (base64 PDF), output_config.format structured output.
 */
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, resolve, basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readdirSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE_DIR = resolve(__dirname, "..", "..", "..", ".client-data", "source", "AI Tranning Documents");
const OUT_DIR = resolve(__dirname, "output");

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("Missing ANTHROPIC_API_KEY. Set it and re-run:\n  ANTHROPIC_API_KEY=sk-ant-... node scripts/extract/extract.mjs");
  process.exit(1);
}
const client = new Anthropic(); // reads ANTHROPIC_API_KEY

// ── structured-output schema (Capital Account Statement / call / distribution) ─
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    doc_type: { type: "string", description: "e.g. Capital Account Statement, Capital Call Notice, Distribution Notice, Quarterly Report" },
    fund_name: { type: "string", description: "the underlying fund / partnership" },
    sponsor: { type: "string", description: "the GP / manager" },
    vehicle: { type: "string", description: "the limited partner / investor named on the document" },
    currency: { type: "string" },
    period_end: { type: "string", description: "statement period end as YYYY-MM-DD, or empty string if none" },
    financials: {
      type: "object",
      additionalProperties: false,
      description: "raw USD amounts; use 0 when the document does not state the value",
      properties: {
        commitment: { type: "number" },
        paid_in: { type: "number" },
        nav: { type: "number" },
        distributions: { type: "number" },
        unfunded: { type: "number" },
        net_irr_pct: { type: "number" },
      },
      required: ["commitment", "paid_in", "nav", "distributions", "unfunded", "net_irr_pct"],
    },
    fields: {
      type: "array",
      description: "every notable extracted line item, with a 0-100 confidence and the page it came from",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          key: { type: "string" },
          value: { type: "string" },
          confidence: { type: "integer" },
          page: { type: "integer" },
        },
        required: ["key", "value", "confidence", "page"],
      },
    },
  },
  required: ["doc_type", "fund_name", "sponsor", "vehicle", "currency", "period_end", "financials", "fields"],
};

const PROMPT = `You are an expert private-markets analyst extracting structured data from a limited partner's fund document (capital account statement, capital call, distribution notice, or quarterly report).

Extract the exact figures as they appear — do not estimate or round. Amounts are raw USD (e.g. "$4,100,206.53" → 4100206.53). If the document does not state a value, use 0 (financials) or omit it (fields). Set "confidence" per field to your calibrated confidence (0-100) that the extracted value is correct; lower it for figures that are faint, ambiguous, or split across columns. Capture commitment, paid-in / contributed capital, NAV / ending capital balance, cumulative distributions, unfunded commitment, and net IRR where present.`;

// ── extraction ────────────────────────────────────────────────────────────────
async function extractOne(pdfPath) {
  const data = readFileSync(pdfPath).toString("base64");
  const res = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 4096,
    thinking: { type: "adaptive" },
    output_config: { format: { type: "json_schema", schema: SCHEMA } },
    messages: [{
      role: "user",
      content: [
        { type: "document", source: { type: "base64", media_type: "application/pdf", data } },
        { type: "text", text: PROMPT },
      ],
    }],
  });
  if (res.stop_reason === "refusal") throw new Error("model refused");
  const text = res.content.find((b) => b.type === "text")?.text;
  if (!text) throw new Error("no text block in response");
  return JSON.parse(text);
}

// Default corpus: the small, single-statement docs (CAS / calls / distributions)
// — the figure-bearing documents. Large multi-hundred-page reports exceed the
// PDF page limit and aren't the extraction target.
function defaultTargets() {
  const out = [];
  for (const sub of ["Capital Account Statements", "Capital Calls", "Distributions"]) {
    const dir = join(SOURCE_DIR, sub);
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir)) {
      if (!f.toLowerCase().endsWith(".pdf") || f.startsWith("._") || f.includes(" copy")) continue;
      const p = join(dir, f);
      if (statSync(p).size < 1_000_000) out.push(p); // <1MB ≈ a few pages
    }
  }
  return out;
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const globArg = args.find((a) => !a.startsWith("--"));
  if (!existsSync(SOURCE_DIR)) {
    console.error(`Source corpus not found at ${SOURCE_DIR}. Unzip the client documents there first.`);
    process.exit(1);
  }
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  const targets = (globArg
    ? defaultTargets().filter((p) => basename(p).toLowerCase().includes(globArg.toLowerCase()))
    : defaultTargets());
  console.log(`Extracting ${targets.length} document(s) with claude-opus-4-8 → ${OUT_DIR}`);

  let ok = 0, skipped = 0, failed = 0;
  for (const p of targets) {
    const outPath = join(OUT_DIR, basename(p).replace(/\.pdf$/i, ".json"));
    if (existsSync(outPath) && !force) { skipped++; console.log(`  · skip (cached) ${basename(p)}`); continue; }
    try {
      const result = await extractOne(p);
      result._source = basename(p);
      writeFileSync(outPath, JSON.stringify(result, null, 2));
      ok++;
      console.log(`  ✓ ${basename(p)} → ${result.fund_name} | NAV ${result.financials.nav} | ${result.fields.length} fields`);
    } catch (e) {
      failed++;
      console.warn(`  ✗ ${basename(p)}: ${e.message}`);
    }
  }
  console.log(`\nDone. ${ok} extracted, ${skipped} cached, ${failed} failed.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
