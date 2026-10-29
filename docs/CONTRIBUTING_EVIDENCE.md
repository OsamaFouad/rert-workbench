# Contributing evidence

Numbers that drive a status must be traceable to a sentence or table cell in a source you can read. Thank you for helping.

## Steps
1. **Find the full text.** Open-access only for automated checks. If you only have the abstract, add the source with `accessStatus: "abstract-only"` and records with `threshold: null`.
2. **Save the full text** (not committed) under `.fulltext-cache/<region>/<file>` — XML from Europe PMC, or verbatim text for PDFs/HTML.
3. **Add records** to `evidence/extraction/<region>/constraints.json` (and `sources.json`). Required fields are listed in the existing files. Key rules:
   - `quote` must be an **exact** substring of the full text (whitespace may differ).
   - Record metric, dose quantity, α/β and its source, scope (per-course vs cumulative), category, interval conditions and whether recovery is already included — exactly as stated.
   - Use `observed-toxicity-association` for "no toxicity below X" or correlation findings. These are never evaluated as limits.
   - Never infer numbers from abstracts, figures you cannot read, or secondary citations.
4. **Record curation decisions** (interpretations, disease scope, either-or groups, interval bands, PRV) in `evidence/curation.json` with a `_why`.
5. **Run:**
   ```
   npm run verify:evidence   # all quotes must match
   npm run build:evidence    # regenerates src/evidence/data/evidence.json
   npm run coverage          # regenerates docs/EVIDENCE_COVERAGE.md
   npm test
   ```
6. **Bump `datasetVersion`** in `evidence/curation.json` (semver: patch = corrections, minor = new records, major = rule changes) and add a CHANGELOG entry.
7. **Second reviewer.** A different person should check each new enabled record against the source before merge.

## Recovery models
Add to `recovery_models.json`. A model is applied only when `enabled: true` is set in curation **and** `pairedSourceKeys` lists the source of the limit it may be combined with. Set `maxPriorCourses` to what the source supports.

## Synthetic test fixtures
`src/evidence/fixtures/synthetic-test-thresholds.json` holds invented values for software tests. Every record has `isTestFixture: true`. Never move them into the literature dataset.
