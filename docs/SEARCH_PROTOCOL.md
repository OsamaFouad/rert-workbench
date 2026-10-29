# Evidence search protocol (dataset v1.0.0)

**Search date:** 2026-10-29. **Coverage claim:** none. This is a targeted, non-exhaustive search for a research prototype.

## Question
Which published organ-at-risk (OAR) dose constraints, α/β choices and recovery models for photon reirradiation of the
**brain/CNS** and **head & neck** can be stated with an exact metric, dose quantity, threshold and source location?

## Starting sources (required by the project brief)
| Source | Access | Numeric OAR limits? |
|---|---|---|
| ESTRO consensus on cumulative dose evaluation (Radiother Oncol 2025, doi:10.1016/j.radonc.2025.111313) | Full text (publisher OA HTML) | No — methodology only |
| ReCOG consensus on dose evaluation and reporting (Lancet Oncol, doi:10.1016/S1470-2045(25)00562-5) | Abstract only (paywalled) | Not extracted |
| Danish national consensus on reirradiation workflow (PMC12305692) | Full text | No — methodology (α/β, D2%, recovery statement) |
| ESTRO/EANO recommendation on reirradiation of glioblastoma (doi:10.1016/j.radonc.2024.110696) + corrigendum | Full text (publisher OA HTML) | Observed associations only |
| International expert consensus on recurrent HNSCC (eScholarship 4kq0x28z / Lancet Oncol 2026) | **Not accessed** — eScholarship bot-check not bypassed; Lancet paywalled | Not extracted |

## Databases and methods
- **Europe PMC REST API** (DOI lookups, free-text queries, `OPEN_ACCESS:Y` filters, `SRC:PPR` for preprints); full text via `fullTextXML`.
- **Publisher HTML** for two open-access Radiotherapy & Oncology articles that block scripted download: rendered article text saved verbatim from a browser.
- **PDF supplements** (Paradis 2019 Appendices E1/E2; RCR guidance) converted to text with pypdf.
- **Reference chasing** from the starting sources (e.g. Paradis 2019, Murr 2023, Nieder 2005/2006, Ang 2001, West 2025).
- WebSearch used only for discovery; never as a quote source.

Representative queries (full logs: `evidence/extraction/*/search_log.md`):
- `(reirradiation OR re-irradiation) AND (brainstem OR chiasm OR optic) AND (cumulative OR EQD2 OR BED) AND OPEN_ACCESS:Y`
- `(reirradiation OR re-irradiation) AND ("spinal cord" OR carotid OR mandible OR "temporal lobe" OR "brachial plexus") AND (cumulative OR EQD2) AND OPEN_ACCESS:Y`
- `(TITLE:"reirradiation" OR TITLE:"re-irradiation") AND ("dose accumulation" OR "cumulative dose" OR "tissue recovery") AND OPEN_ACCESS:Y`

## Inclusion criteria
- Primary studies, consensus/guidelines, institutional protocols or reviews reporting reirradiation OAR doses for brain/CNS, head & neck, or cross-site methodology.
- Full text accessible to the extractor (open access). Abstract-only items are **listed** with no numbers.

## Extraction rules
1. A numeric value enters the dataset only with a **verbatim quote** that is machine-matched (whitespace-normalised) against the saved full text (`scripts/verify-quotes.mjs`). Result for v1.0.0: **161 quotes checked, 0 failures** (re-run independently of the extraction agents).
2. Metric, dose quantity, α/β, scope (per-course / cumulative), category and conditions recorded as stated. Nothing inferred from abstracts.
3. Observed toxicity associations are labelled as such and **never evaluated as limits**.
4. Interpretations made during curation (e.g. reading "limit" as ≤, either-or criteria, interval bands, PRV designation) are recorded with a `_why` in `evidence/curation.json`.
5. Records with missing α/β, unstated metric, unstated dose quantity, ambiguous extraction, Gy(RBE) proton values, or non-upper-bound inequalities are listed but **not enabled**.

## Known gaps (most important)
- Paywalled: ReCOG consensus, international rHNSCC consensus, ESTRO-EORTC 2022, West 2025 (recovery scaling), Nieder 2005/2006 and Kirkpatrick/Woolley spinal cord reirradiation papers, McGovern 2023, PENTEC 2024, Ng 2021 NPC recommendations, MIRI papers.
- No enabled checks for normal brain, cochlea, lens, hippocampus, carotid, mandible, temporal lobe, pharyngeal constrictors, parotid, oral cavity or skin.
- Only one recovery model is enabled (Paradis 2019 Appendix E2 discount table), and only with its own form's limits and one prior course.

See `docs/EVIDENCE_COVERAGE.md` for the per-organ table.
