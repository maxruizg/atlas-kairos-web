/**
 * Server-only Supabase PostgREST client.
 *
 * The new family-office modules (direct investments, taxonomy, audit log)
 * persist directly to Supabase from Remix loaders/actions using the
 * service-role key — never exposed to the browser (this file is
 * `.server.ts`, stripped from the client bundle). Multi-tenancy is enforced
 * in app code by always filtering on `organization_id`.
 *
 * Required env (set in frontend/.env locally AND in Vercel project settings):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */
import type {
  DirectInvestment,
  TaxonomyLists,
  AuditEntry,
  ValuationEntry,
  Document,
  ReviewField,
  GraphNodeMeta,
  Sponsor,
  SponsorBase,
  Fund,
  Entity,
} from "~/lib/types";
import { DEFAULT_TAXONOMY } from "~/lib/taxonomy";
import { fetchWithRetry } from "~/lib/retry";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

function restBase(): string {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    throw new Response(
      "Supabase is not configured: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
      { status: 500 }
    );
  }
  return `${SUPABASE_URL.replace(/\/$/, "")}/rest/v1`;
}

const STORAGE_BUCKET = "documents";

/** Public URL for a file in the documents bucket. */
export function storagePublicUrl(path: string): string {
  return `${SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`;
}

/**
 * Upload bytes to the public `documents` Storage bucket (service-role, upsert).
 * Returns the public URL + storage path.
 */
export async function uploadDocumentFile(
  path: string,
  bytes: ArrayBuffer | Uint8Array,
  contentType: string
): Promise<{ file_url: string; storage_path: string }> {
  const res = await fetchWithRetry(
    `${SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/${STORAGE_BUCKET}/${path}`,
    {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": contentType,
        "x-upsert": "true",
      },
      body: bytes instanceof Uint8Array ? (bytes as unknown as BodyInit) : new Uint8Array(bytes),
    }
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Response(`Storage upload failed (${res.status}): ${body}`, { status: 502 });
  }
  return { file_url: storagePublicUrl(path), storage_path: `${STORAGE_BUCKET}/${path}` };
}

function headers(extra?: Record<string, string>): Record<string, string> {
  return {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

async function pgrst<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetchWithRetry(`${restBase()}${path}`, {
    ...init,
    headers: headers(init?.headers as Record<string, string>),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Response(`Supabase error (${res.status}): ${body}`, { status: 502 });
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

// ── Org resolution ────────────────────────────────────────────────────────

function readSessionUserId(request: Request): string | null {
  const cookie = request.headers.get("Cookie") || "";
  const m = cookie.match(/atlas-session=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

/**
 * Resolve the tenant org id for a request: session user → their org, else
 * the first onboarded org, else the first org. Cached per-request is not
 * needed — loaders call this once.
 */
export async function resolveOrgId(request: Request): Promise<string> {
  const userId = readSessionUserId(request);
  if (userId) {
    try {
      const rows = await pgrst<{ organization_id: string }[]>(
        `/users?id=eq.${encodeURIComponent(userId)}&select=organization_id&limit=1`
      );
      if (rows?.[0]?.organization_id) return rows[0].organization_id;
    } catch {
      /* fall through to org fallback */
    }
  }
  const onboarded = await pgrst<{ id: string }[]>(
    `/organizations?onboarded=eq.true&select=id&order=created_at.asc&limit=1`
  );
  if (onboarded?.[0]?.id) return onboarded[0].id;
  const any = await pgrst<{ id: string }[]>(`/organizations?select=id&limit=1`);
  if (any?.[0]?.id) return any[0].id;
  throw new Response("No organization found in Supabase.", { status: 500 });
}

// ── Direct investments ──────────────────────────────────────────────────────

export async function listDirects(orgId: string, entityId?: string): Promise<DirectInvestment[]> {
  let filter = `organization_id=eq.${orgId}`;
  if (entityId) filter += `&entity_id=eq.${encodeURIComponent(entityId)}`;
  return pgrst<DirectInvestment[]>(`/direct_investments?${filter}&order=created_at.asc`);
}

export async function getDirect(orgId: string, id: string): Promise<DirectInvestment | null> {
  const rows = await pgrst<DirectInvestment[]>(
    `/direct_investments?organization_id=eq.${orgId}&id=eq.${encodeURIComponent(id)}&limit=1`
  );
  return rows?.[0] ?? null;
}

export async function insertDirect(orgId: string, d: DirectInvestment): Promise<DirectInvestment> {
  const row = { ...d, organization_id: orgId };
  const out = await pgrst<DirectInvestment[]>(`/direct_investments`, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(row),
  });
  return out[0];
}

export async function updateDirect(
  orgId: string,
  id: string,
  patch: Partial<DirectInvestment>
): Promise<DirectInvestment> {
  const out = await pgrst<DirectInvestment[]>(
    `/direct_investments?organization_id=eq.${orgId}&id=eq.${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(patch),
    }
  );
  return out[0];
}

export async function deleteDirect(orgId: string, id: string): Promise<void> {
  await pgrst<void>(
    `/direct_investments?organization_id=eq.${orgId}&id=eq.${encodeURIComponent(id)}`,
    { method: "DELETE" }
  );
}

// ── Sponsors ────────────────────────────────────────────────────────────────
// Persisted base columns only; the aggregate metrics on the `Sponsor` type
// (fund_count / total_nav / tvpi / net_irr / company_count) are DERIVED from
// the org's funds at read time — see `lib/portfolio.ts`.

const SPONSOR_SELECT = "id,name,initials,country,color,asset_classes";

export async function listSponsors(orgId: string): Promise<SponsorBase[]> {
  return pgrst<SponsorBase[]>(
    `/sponsors?organization_id=eq.${orgId}&select=${SPONSOR_SELECT}&order=created_at.asc`
  );
}

export async function insertSponsor(orgId: string, s: Partial<Sponsor> & { id: string; name: string; initials: string }): Promise<SponsorBase> {
  const row = {
    id: s.id,
    organization_id: orgId,
    name: s.name,
    initials: s.initials,
    country: s.country ?? "",
    color: s.color ?? "#8B7BD8",
    asset_classes: s.asset_classes ?? [],
  };
  const out = await pgrst<SponsorBase[]>(`/sponsors?select=${SPONSOR_SELECT}`, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(row),
  });
  return out[0];
}

export async function updateSponsor(
  orgId: string,
  id: string,
  patch: Partial<SponsorBase>
): Promise<SponsorBase> {
  const out = await pgrst<SponsorBase[]>(
    `/sponsors?organization_id=eq.${orgId}&id=eq.${encodeURIComponent(id)}&select=${SPONSOR_SELECT}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(patch),
    }
  );
  return out[0];
}

export async function deleteSponsor(orgId: string, id: string): Promise<void> {
  await pgrst<void>(
    `/sponsors?organization_id=eq.${orgId}&id=eq.${encodeURIComponent(id)}`,
    { method: "DELETE" }
  );
}

// ── Funds ─────────────────────────────────────────────────────────────────--

const FUND_SELECT =
  "id,sponsor_id,entity_id,name,vintage,strategy,asset_class,sub_theme,ticket_size," +
  "fund_size,geography,currency,commitment,paid_in,nav,distributions,unfunded,tvpi," +
  "dpi,rvpi,gross_irr,net_irr,gross_moic,net_moic,pct_called,latest_report_q," +
  "report_received,risk_rating,transactions,companies,nav_history,cashflows,capital_log";

/** Map a (partial) Fund to the persistable row, defaulting every column so a
 *  minimal Add-Fund payload still satisfies the NOT NULL constraints. */
function fundRow(orgId: string, f: Partial<Fund> & { id: string }) {
  return {
    id: f.id,
    organization_id: orgId,
    sponsor_id: f.sponsor_id,
    entity_id: f.entity_id,
    name: f.name ?? "",
    vintage: f.vintage ?? new Date().getUTCFullYear(),
    strategy: f.strategy ?? "",
    asset_class: f.asset_class ?? "",
    sub_theme: f.sub_theme ?? null,
    ticket_size: f.ticket_size ?? null,
    fund_size: f.fund_size ?? null,
    geography: f.geography ?? "",
    currency: f.currency ?? "USD",
    commitment: f.commitment ?? 0,
    paid_in: f.paid_in ?? 0,
    nav: f.nav ?? 0,
    distributions: f.distributions ?? 0,
    unfunded: f.unfunded ?? 0,
    tvpi: f.tvpi ?? 0,
    dpi: f.dpi ?? 0,
    rvpi: f.rvpi ?? 0,
    gross_irr: f.gross_irr ?? 0,
    net_irr: f.net_irr ?? 0,
    gross_moic: f.gross_moic ?? 0,
    net_moic: f.net_moic ?? 0,
    pct_called: f.pct_called ?? 0,
    latest_report_q: f.latest_report_q ?? "",
    report_received: f.report_received ?? false,
    risk_rating: f.risk_rating ?? null,
    transactions: f.transactions ?? [],
    companies: f.companies ?? [],
    nav_history: f.nav_history ?? [],
    cashflows: f.cashflows ?? [],
    capital_log: f.capital_log ?? [],
  };
}

export async function listFunds(orgId: string, entityId?: string): Promise<Fund[]> {
  let filter = `organization_id=eq.${orgId}`;
  if (entityId) filter += `&entity_id=eq.${encodeURIComponent(entityId)}`;
  return pgrst<Fund[]>(`/funds?${filter}&select=${FUND_SELECT}&order=vintage.asc`);
}

export async function insertFund(orgId: string, f: Partial<Fund> & { id: string }): Promise<Fund> {
  const out = await pgrst<Fund[]>(`/funds?select=${FUND_SELECT}`, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(fundRow(orgId, f)),
  });
  return out[0];
}

export async function updateFund(
  orgId: string,
  id: string,
  patch: Partial<Fund>
): Promise<Fund> {
  const out = await pgrst<Fund[]>(
    `/funds?organization_id=eq.${orgId}&id=eq.${encodeURIComponent(id)}&select=${FUND_SELECT}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(patch),
    }
  );
  return out[0];
}

export async function deleteFund(orgId: string, id: string): Promise<void> {
  await pgrst<void>(
    `/funds?organization_id=eq.${orgId}&id=eq.${encodeURIComponent(id)}`,
    { method: "DELETE" }
  );
}

export async function getSponsorById(orgId: string, id: string): Promise<SponsorBase | null> {
  const rows = await pgrst<SponsorBase[]>(
    `/sponsors?organization_id=eq.${orgId}&id=eq.${encodeURIComponent(id)}&select=${SPONSOR_SELECT}&limit=1`
  );
  return rows?.[0] ?? null;
}

export async function getFundById(orgId: string, id: string): Promise<Fund | null> {
  const rows = await pgrst<Fund[]>(
    `/funds?organization_id=eq.${orgId}&id=eq.${encodeURIComponent(id)}&select=${FUND_SELECT}&limit=1`
  );
  return rows?.[0] ?? null;
}

// ── Entities ────────────────────────────────────────────────────────────────

export async function listEntities(orgId: string): Promise<Entity[]> {
  return pgrst<Entity[]>(
    `/entities?organization_id=eq.${orgId}&select=*&order=created_at.asc`
  );
}

/**
 * Guarantee the org has at least one entity. Funds/directs FK to `entities`,
 * and the Add Direct drawer requires a non-empty entity — an org with zero
 * entities was the silent-save trap (P0 #2). Returns the full entity list.
 */
export async function ensureDefaultEntity(orgId: string, orgName?: string): Promise<Entity[]> {
  const existing = await listEntities(orgId);
  if (existing.length > 0) return existing;
  const row = {
    id: `e-${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`,
    organization_id: orgId,
    name: orgName?.trim() ? `${orgName.trim()} — Main Portfolio` : "Main Portfolio",
    short: "MAIN",
    nav: 0,
  };
  try {
    return await pgrst<Entity[]>(`/entities?select=*`, {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(row),
    });
  } catch {
    // Lost a race or a unique-short clash — re-read whatever exists now.
    return listEntities(orgId);
  }
}

// ── Segundo Cerebro graph node metadata ─────────────────────────────────────

const GRAPH_META_SELECT =
  "id,node_ref_id,node_type,notes_text,pinned,hidden,pinned_x,pinned_y,created_at,updated_at";

export async function listGraphMeta(orgId: string): Promise<GraphNodeMeta[]> {
  return pgrst<GraphNodeMeta[]>(
    `/graph_node_meta?organization_id=eq.${orgId}&select=${GRAPH_META_SELECT}&order=created_at.asc`
  );
}

/**
 * Upsert one node's metadata. Conflicts on (organization_id, node_ref_id,
 * node_type) merge into the existing row, so the client can fire-and-forget
 * a single intent for both first-write and subsequent edits.
 */
export async function upsertGraphMeta(
  orgId: string,
  meta: GraphNodeMeta
): Promise<GraphNodeMeta> {
  const row = { ...meta, organization_id: orgId };
  const out = await pgrst<GraphNodeMeta[]>(
    `/graph_node_meta?on_conflict=organization_id,node_ref_id,node_type&select=${GRAPH_META_SELECT}`,
    {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(row),
    }
  );
  return out[0];
}

/** Append a valuation entry; recompute current valuation/date + nav history. */
export async function addValuation(
  orgId: string,
  id: string,
  entry: ValuationEntry
): Promise<DirectInvestment> {
  const cur = await getDirect(orgId, id);
  if (!cur) throw new Response("Direct investment not found", { status: 404 });
  const history = [...(cur.valuation_history || []), entry].sort((a, b) =>
    a.date.localeCompare(b.date)
  );
  const latest = history[history.length - 1];
  return updateDirect(orgId, id, {
    valuation_history: history,
    valuation: latest.value,
    valuation_date: latest.date,
    nav_history: history.map((h) => ({ q: h.date.slice(0, 4), nav: h.value })),
  });
}

// ── Taxonomy ────────────────────────────────────────────────────────────────

export async function getTaxonomy(orgId: string): Promise<TaxonomyLists> {
  const rows = await pgrst<{ lists: TaxonomyLists }[]>(
    `/taxonomies?organization_id=eq.${orgId}&select=lists&limit=1`
  );
  const lists = rows?.[0]?.lists;
  // First access for an org → seed defaults (fire-and-forget upsert).
  if (!lists || Object.keys(lists).length === 0) {
    try {
      await putTaxonomy(orgId, DEFAULT_TAXONOMY);
    } catch {
      /* ignore — return defaults regardless */
    }
    return DEFAULT_TAXONOMY;
  }
  // Merge over defaults so any list missing from an older row is filled in.
  return { ...DEFAULT_TAXONOMY, ...lists };
}

export async function putTaxonomy(orgId: string, lists: TaxonomyLists): Promise<void> {
  await pgrst<unknown>(`/taxonomies?on_conflict=organization_id`, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ organization_id: orgId, lists }),
  });
}

// ── Audit log ────────────────────────────────────────────────────────────────

interface AuditRow {
  id: string;
  ts: string;
  user_name: string;
  action: string;
  entity: string;
  field: string | null;
  old_value: string | null;
  new_value: string | null;
  screen: string;
}

export async function listAudit(orgId: string, limit = 200): Promise<AuditEntry[]> {
  const rows = await pgrst<AuditRow[]>(
    `/audit_log?organization_id=eq.${orgId}&order=ts.desc&limit=${limit}`
  );
  return (rows || []).map((r) => ({
    id: r.id,
    timestamp: r.ts,
    user: r.user_name,
    action: r.action,
    entity: r.entity,
    field: r.field,
    old_value: r.old_value,
    new_value: r.new_value,
    screen: r.screen,
  }));
}

export async function insertAudit(
  orgId: string,
  e: Omit<AuditEntry, "id" | "timestamp">
): Promise<void> {
  await pgrst<unknown>(`/audit_log`, {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      organization_id: orgId,
      user_name: e.user,
      action: e.action,
      entity: e.entity,
      field: e.field ?? null,
      old_value: e.old_value ?? null,
      new_value: e.new_value ?? null,
      screen: e.screen,
    }),
  });
}

// ── Documents ────────────────────────────────────────────────────────────────

// Full select assumes the storage/review migration (20260606) is applied. On a
// DB still on the base documents schema, PostgREST 400s on the missing columns,
// so we fall back to the minimal set — the Vault/Review/header badge still
// populate (just without file preview / field-level review) instead of the
// whole documents query silently returning []. This was the real reason the
// Vault always showed "0 documents".
const DOC_SELECT =
  "id,name,doc_type,fund,status,confidence,date,size,fields,extracted," +
  "sponsor_id,fund_id,direct_id,file_url,storage_path,pages,extracted_fields,vehicle,period_end";
const DOC_SELECT_MIN =
  "id,name,doc_type,fund,status,confidence,date,size,fields,extracted,sponsor_id,fund_id";

export async function listDocuments(orgId: string, status?: string): Promise<Document[]> {
  let filter = `organization_id=eq.${orgId}`;
  if (status && status !== "all") filter += `&status=eq.${encodeURIComponent(status)}`;
  try {
    return await pgrst<Document[]>(`/documents?${filter}&select=${DOC_SELECT}&order=date.desc`);
  } catch {
    return pgrst<Document[]>(`/documents?${filter}&select=${DOC_SELECT_MIN}&order=date.desc`);
  }
}

export async function getDocument(orgId: string, id: string): Promise<Document | null> {
  const q = (sel: string) =>
    `/documents?organization_id=eq.${orgId}&id=eq.${encodeURIComponent(id)}&select=${sel}&limit=1`;
  let rows: Document[];
  try {
    rows = await pgrst<Document[]>(q(DOC_SELECT));
  } catch {
    rows = await pgrst<Document[]>(q(DOC_SELECT_MIN));
  }
  return rows?.[0] ?? null;
}

export async function insertDocument(orgId: string, d: Document): Promise<Document> {
  const row = { ...d, organization_id: orgId };
  const out = await pgrst<Document[]>(`/documents`, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(row),
  });
  return out[0];
}

export async function updateDocumentStatus(
  orgId: string,
  id: string,
  status: string
): Promise<Document> {
  const out = await pgrst<Document[]>(
    `/documents?organization_id=eq.${orgId}&id=eq.${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ status }),
    }
  );
  return out[0];
}

/** Persist the extracted-field approval state (and recompute `extracted`). */
export async function setDocumentFields(
  orgId: string,
  id: string,
  fields: ReviewField[]
): Promise<Document> {
  const extracted = fields.filter((f) => f.approved !== null).length;
  const out = await pgrst<Document[]>(
    `/documents?organization_id=eq.${orgId}&id=eq.${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ extracted_fields: fields, extracted }),
    }
  );
  return out[0];
}
