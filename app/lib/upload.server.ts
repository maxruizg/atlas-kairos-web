import {
  resolveOrgId,
  uploadDocumentFile,
  insertDocument,
  insertAudit,
} from "~/lib/supabase.server";
import type { Document, ReviewField } from "~/lib/types";

/** Human-readable file size, matching the seed/Rust shape ("1.2 MB"). */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);
}

/**
 * Upload a document: push the real bytes to the public `documents` Storage
 * bucket, insert the metadata row (status "Needs Review" with a couple of
 * extracted fields so it flows into the Review screen), and post to the audit
 * ledger. The new doc shows up everywhere via loader revalidation.
 */
export async function handleUploadAction(request: Request) {
  const formData = await request.formData();

  const file = formData.get("file") as File | null;
  const docType = formData.get("doc_type") as string | null;
  const fund = formData.get("fund") as string | null;

  if (!file || !docType || !fund) {
    return { error: "Missing required fields" };
  }

  try {
    const orgId = await resolveOrgId(request);
    const id = `doc-${crypto.randomUUID()}`;
    const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
    const path = `${orgId}/${id}-${slug(file.name)}.${ext}`;
    const bytes = await file.arrayBuffer();
    const { file_url, storage_path } = await uploadDocumentFile(
      path,
      bytes,
      file.type || (ext === "xlsx" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "application/pdf")
    );

    const today = new Date().toISOString().slice(0, 10);
    const fields: ReviewField[] = [
      { id: "f1", key: "Fund", value: fund, confidence: 99, page: 1, approved: null, flagged: false },
      { id: "f2", key: "Document Type", value: docType, confidence: 97, page: 1, approved: null, flagged: false },
      { id: "f3", key: "Upload Date", value: today, confidence: 100, page: 1, approved: null, flagged: false },
    ];

    const document: Document = {
      id,
      name: file.name,
      doc_type: docType,
      fund,
      status: "Needs Review",
      confidence: 88,
      date: today,
      size: formatSize(file.size),
      fields: fields.length,
      extracted: 0,
      sponsor_id: null,
      fund_id: null,
      direct_id: null,
      file_url,
      storage_path,
      pages: 1,
      extracted_fields: fields,
      vehicle: null,
      period_end: null,
    };

    const created = await insertDocument(orgId, document);
    await insertAudit(orgId, {
      user: "Owner",
      action: "create",
      entity: file.name,
      field: null,
      old_value: null,
      new_value: "Uploaded",
      screen: "Vault",
    });
    return { document: created };
  } catch (err) {
    const message =
      err instanceof Response ? await err.text().catch(() => "Upload failed") : String(err);
    return { error: message };
  }
}
