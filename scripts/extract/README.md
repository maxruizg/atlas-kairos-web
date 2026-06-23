# Atlas document-extraction pipeline

Real AI extraction: sends each client PDF to Claude (`claude-opus-4-8`, native
PDF support) and writes structured JSON — fund, sponsor, vehicle, period,
headline financials, and per-field confidence — to `output/` (gitignored).

## Run

```bash
cd frontend
ANTHROPIC_API_KEY=sk-ant-... npm run extract:docs          # all CAS/calls/distributions
ANTHROPIC_API_KEY=sk-ant-... npm run extract:docs -- khosla  # filter by filename
ANTHROPIC_API_KEY=sk-ant-... npm run extract:docs -- --force  # re-extract (ignore cache)
```

Reads the corpus from `../../.client-data/source/AI Tranning Documents/`
(unzip the client documents there first). Idempotent: skips a document whose
`output/<name>.json` already exists unless `--force`.

## How it fits

- **`extract.mjs`** — the pipeline (this is the reusable "AI" artifact).
- **`../koval-data.mjs`** — the portfolio dataset (entities / sponsors / funds),
  transcribed from these documents; metrics derived (TVPI/DPI/RVPI, XIRR).
- **`../koval-documents.mjs`** — the Vault document registry + extracted fields.
- **`../seed-koval.mjs` / `../seed-documents.mjs`** — load the above into Supabase.

The seeds don't depend on a live run of this pipeline (figures were transcribed
directly), so the platform works without an API key. Run the pipeline to
regenerate extractions from a live model or to process new documents; its output
(`vehicle`, real figures) is the raw, non-anonymised extraction — keep it
gitignored and feed it through the same anonymisation the seeds apply.

## Notes

- Targets the single-statement docs (CAS / capital calls / distributions, <1MB).
  Large multi-hundred-page annual reports exceed the PDF page limit and are not
  the extraction target.
- Output carries the **real** client identity (`vehicle`) — never commit it.
