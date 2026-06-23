# Altavena client integration — status & outstanding items

A real client portfolio was loaded into Atlas (hosted Supabase, org "Atlas Family
Office"). The client identity is **anonymised to the fictional "Altavena"** — we
have permission to use the data, not to render the real name. Public fund-manager
/ fund names (Bain, KKR, Blackstone, Apollo, BlackRock, Advent, Crow Holdings,
Khosla) are kept.

## What's live (done & verified)

- **Portfolio**: 3 entities (Altavena NC LLC / PE LLC / Offshore Ltd) · 8 sponsors ·
  **9 funds** (~$49.3M NAV) — exact figures transcribed from the client's CAS /
  capital-call / distribution / tracker corpus; metrics derived (TVPI/DPI/RVPI,
  net IRR document-stated or XIRR). Verified on Dashboard / Sponsors / Metrics.
- **Documents**: migration `20260606` (storage/review columns + `documents`
  bucket) applied to the hosted DB; **12 documents** seeded with real extracted
  fields + confidence. Verified on Vault and the field-level Review screen.
- **AI extraction pipeline**: `scripts/extract/` (`npm run extract:docs`) —
  Claude Opus 4.8, native PDF, structured output.

Single source of truth: `scripts/koval-data.mjs` (portfolio) + `koval-documents.mjs`
(Vault docs). Reload with `npm run seed:koval` + `npm run seed:docs`. Real source
PDFs are gitignored at `../.client-data/source/` (never commit).

## ⚠️ Outstanding before deploy — TWO items

### 1. Temporary dev-auth bypass is ACTIVE in `app/routes/_app.tsx`

The `_app` loader has a `DEV_BYPASS` block (marked `// ── TEMP DEV PREVIEW BYPASS
— remove before commit`, ~lines 30–58) that skips the session → `getMe` →
onboarding gate so the seeded hosted data renders under `npm run dev` **without
the Rust auth backend running locally**.

- It is gated on `process.env.NODE_ENV !== "production"`, so it is **auto-disabled
  in production builds** (`react-router build`) and does not affect the deployed
  app even if shipped.
- **Still: revert it before committing.** Pushing to `main` is a Vercel **production
  release**, and leaving an auth bypass in source (even prod-gated) is not
  acceptable for a financial app.
- **To revert**: delete the `DEV_BYPASS` branch and restore the original gate —
  `getSessionFromRequest` → `api.getMe(cookie)` (401 → `/login`) →
  `api.getOrganization(cookie)` (not onboarded → `/onboarding`). The original
  shape is preserved in git history for this file.

### 2. Copilot / Oracle still returns hardcoded demo answers

`app/lib/atlas-ai-answers.ts` returns canned Q&A that reference the **removed demo
data** (Pampa Energy Transition Fund, Andes Direct Lending, Clip, Nowports), with
citations to 3 deterministic `audit_log` rows (`…2041/2042/2043`, seeded by the
old migration). Every other screen reflects the real Altavena portfolio; the
Oracle screen does not.

- **To fix**: rewrite the answer set in `atlas-ai-answers.ts` against the 9 real
  funds (e.g. "total unfunded by asset class", "highest net IRR" → NGT II 15.05%),
  and re-point the citations at real documents (the `k-doc-cas-*` rows now in the
  Vault) or refresh the demo `audit_log` rows. `app/lib/seed.ts` also carries the
  old demo fund list if a fuller cleanup is wanted.

Until both are addressed, keep the work on a branch — do **not** `git push main`.
