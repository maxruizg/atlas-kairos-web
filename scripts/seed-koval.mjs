/**
 * Seed the Koval Capital portfolio into Supabase — REAL data transcribed from
 * the family office's source documents (Capital Account Statements, capital
 * calls, distribution notices, quarterly reports and portfolio trackers).
 *
 * The dataset lives in ./koval-data.mjs (shared with seed-documents.mjs so the
 * portfolio and the documents never drift apart).
 *
 *   • 3 holding entities: Tierra NC LLC, Tierra PE LLC, Jupiter Corporate Ltd
 *   • 8 sponsors (GPs): Bain Capital, Khosla, Crow Holdings, KKR, Blackstone,
 *     Apollo, BlackRock, Advent
 *   • 9 funds across PE / VC / Real Assets / Private Credit
 *
 * Idempotent: every row uses a stable `k-…` id and is upserted on its primary
 * key, so re-running refreshes the numbers without creating duplicates.
 *
 *   cd frontend && npm run seed:koval
 *
 * Reads SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from frontend/.env.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { ENTITIES, SPONSORS, FUNDS, entityNav } from "./koval-data.mjs";

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
const SUPABASE_URL = (env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/\/$/, "");
const SERVICE_KEY = (env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
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

/** Upsert rows on their primary key. */
async function upsert(table, rows, conflict = "id") {
  if (!rows.length) return;
  await rest(`/${table}?on_conflict=${conflict}`, {
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

/** Make sure the taxonomy's asset-class list covers everything the funds use
 *  (the Sponsors screen filter reads taxonomy.lists.assetClasses). */
async function ensureAssetClasses(orgId) {
  const used = [...new Set(FUNDS.map((f) => f.asset_class))];
  let rows;
  try {
    rows = await rest(`/taxonomies?organization_id=eq.${orgId}&select=lists`);
  } catch {
    return; // taxonomies table not present — skip silently
  }
  const lists = rows?.[0]?.lists ?? {};
  const have = new Set(lists.assetClasses || []);
  const merged = [...(lists.assetClasses || [])];
  let added = 0;
  for (const ac of used) if (!have.has(ac)) { merged.push(ac); added++; }
  if (added === 0) return;
  await upsert("taxonomies", [{ organization_id: orgId, lists: { ...lists, assetClasses: merged } }], "organization_id");
  console.log(`  ✓ taxonomy: added ${added} asset class(es) → ${merged.join(", ")}`);
}

// ── run ───────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`Seeding Koval portfolio → ${SUPABASE_URL}`);
  const orgId = await resolveOrgId();
  console.log(`  org: ${orgId}`);

  // Entities — reconcile each entity's NAV to the sum of its funds.
  const entities = ENTITIES.map((e) => ({ ...e, organization_id: orgId, nav: entityNav(e.id) }));
  await upsert("entities", entities);

  await upsert("sponsors", SPONSORS.map((s) => ({ ...s, organization_id: orgId })));
  await upsert("funds", FUNDS.map((f) => ({ ...f, organization_id: orgId })));
  await ensureAssetClasses(orgId);

  const totalNav = entities.reduce((a, e) => a + e.nav, 0);
  console.log(
    `\nDone. ${entities.length} entities · ${SPONSORS.length} sponsors · ${FUNDS.length} funds. ` +
    `Portfolio NAV $${Math.round(totalNav).toLocaleString("en-US")}.`
  );
  for (const e of entities) console.log(`  • ${e.name.padEnd(22)} $${Math.round(e.nav).toLocaleString("en-US")}`);
}

main().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
