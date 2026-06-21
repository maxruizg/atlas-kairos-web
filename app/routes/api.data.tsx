import {
  resolveOrgId,
  insertDirect,
  updateDirect,
  deleteDirect,
  addValuation,
  putTaxonomy,
  insertAudit,
  insertDocument,
  updateDocumentStatus,
  getDocument,
  setDocumentFields,
  upsertGraphMeta,
  insertSponsor,
  updateSponsor,
  deleteSponsor,
  insertFund,
  updateFund,
  deleteFund,
} from "~/lib/supabase.server";

/**
 * Single server-side mutation endpoint for the Supabase-backed modules
 * (direct investments, taxonomy, audit log). The browser POSTs JSON
 * `{ intent, ... }`; we resolve the tenant org from the session cookie and
 * write through the service-role PostgREST client. Read paths live in the
 * individual route loaders.
 */
export async function action({ request }: { request: Request }) {
  if (request.method !== "POST") {
    return Response.json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }

  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const intent = payload?.intent as string;
  try {
    const orgId = await resolveOrgId(request);

    switch (intent) {
      case "create-direct": {
        const created = await insertDirect(orgId, payload.direct);
        return Response.json({ ok: true, direct: created });
      }
      case "update-direct": {
        const updated = await updateDirect(orgId, payload.id, payload.patch);
        return Response.json({ ok: true, direct: updated });
      }
      case "delete-direct": {
        await deleteDirect(orgId, payload.id);
        return Response.json({ ok: true });
      }
      case "create-sponsor": {
        const created = await insertSponsor(orgId, payload.sponsor);
        return Response.json({ ok: true, sponsor: created });
      }
      case "update-sponsor": {
        const updated = await updateSponsor(orgId, payload.id, payload.patch);
        return Response.json({ ok: true, sponsor: updated });
      }
      case "delete-sponsor": {
        await deleteSponsor(orgId, payload.id);
        return Response.json({ ok: true });
      }
      case "create-fund": {
        const created = await insertFund(orgId, payload.fund);
        return Response.json({ ok: true, fund: created });
      }
      case "update-fund": {
        const updated = await updateFund(orgId, payload.id, payload.patch);
        return Response.json({ ok: true, fund: updated });
      }
      case "delete-fund": {
        await deleteFund(orgId, payload.id);
        return Response.json({ ok: true });
      }
      case "add-valuation": {
        const updated = await addValuation(orgId, payload.id, payload.entry);
        return Response.json({ ok: true, direct: updated });
      }
      case "put-taxonomy": {
        await putTaxonomy(orgId, payload.lists);
        return Response.json({ ok: true });
      }
      case "create-audit": {
        await insertAudit(orgId, payload.entry);
        return Response.json({ ok: true });
      }
      case "create-document": {
        const created = await insertDocument(orgId, payload.document);
        return Response.json({ ok: true, document: created });
      }
      case "update-document-status": {
        const updated = await updateDocumentStatus(orgId, payload.id, payload.status);
        return Response.json({ ok: true, document: updated });
      }
      case "approve-doc-field": {
        // Toggle a single extracted field's approval and persist the array.
        const doc = await getDocument(orgId, payload.id);
        if (!doc) return Response.json({ ok: false, error: "Document not found" }, { status: 404 });
        const fields = (doc.extracted_fields || []).map((f) =>
          f.id === payload.fieldId ? { ...f, approved: payload.approved } : f
        );
        const updated = await setDocumentFields(orgId, payload.id, fields);
        return Response.json({ ok: true, document: updated });
      }
      case "upsert-graph-meta": {
        const meta = await upsertGraphMeta(orgId, payload.meta);
        return Response.json({ ok: true, meta });
      }
      default:
        return Response.json({ ok: false, error: `Unknown intent: ${intent}` }, { status: 400 });
    }
  } catch (err) {
    const message =
      err instanceof Response ? await err.text().catch(() => "Server error") : String(err);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}

// No default export — this is a resource route (action only).
