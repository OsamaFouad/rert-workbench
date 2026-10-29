# ReRT Workbench

An interactive, evidence-linked **reirradiation organ-at-risk (OAR) dose-review** tool.
It is a **research and educational prototype**, and it works with **fictional cases only**.

> **Not a medical device. Not clinically validated.** The tool reviews OAR dose calculations and compares them with published constraints.
> It never decides whether radiotherapy should be offered or refused.
> "Within selected constraints" is **not** clinical clearance and **not** proof of safety.

## What it does
- **Workflow:** New Case → Previous Courses → OAR Data → Evidence Comparison → Proposed Plan → Case Dashboard → Discussion Report.
- **Pathways:** Brain / CNS and Head & Neck templates, plus custom organs. Adding a region needs only data (see `src/domain/templates.ts`).
- **Courses:** multiple previous courses, each with several phases or boosts, and one proposed course. The interval is calculated separately for each prior course.
- **Calculation:** per-phase BED and EQD2, with α/β fixed per reference. Near-maximum doses are summed only as a labelled conservative estimate.
  The tool also shows unadjusted and supported recovery-adjusted prior dose, remaining headroom, and a conditional physical-dose ceiling.
- **Evidence:** a versioned dataset with source, location and a verbatim quote for every enabled number. References are compared side by side, and the tool explains why they disagree.
- **Statuses:** Within selected constraints · Exceeds selected constraints · Insufficient data · Requires review.
  Coverage is shown as "N of M required checks evaluable".
- **Report:** printable (save as PDF), with the app version and evidence-dataset version.
- **Arabic Glossary:** Arabic explanations of the terms, formulas, assumptions and status labels.
- **Storage:** browser `localStorage` only, with JSON export and import and a reset-to-demo option. There are no accounts and no server.

## Quick start
Requires Node.js ≥ 20 (tested with 22).
```bash
npm ci
npm run dev          # http://localhost:5173
npm test             # unit tests (engine, dataset integrity, demo oracles)
npm run test:e2e     # Playwright end-to-end (uses installed Chrome locally; set PW_CHANNEL= to use Playwright Chromium)
npm run build        # static site in dist/
```
GitHub Pages: `.github/workflows/pages.yml` builds with `BASE_PATH=/<repo>/` and deploys `dist/`. Routing is hash-based, so no server rewrite rules are needed.

## Supported scenarios
| Supported (automated) | Flagged — Requires review / Insufficient data |
|---|---|
| Photon or electron courses with equal fractions | Proton/carbon RBE, brachytherapy, radionuclide, dose-rate effects |
| Near-max metrics (Dmax, D≤1cc, D≤2%) summed with a documented or conservative basis | Undocumented spatial overlap; D>1cc summation |
| Cumulative EQD2/BED limits; per-course limits on the proposed course | Mean-dose EQD2 limits; Vx metrics |
| Recovery from an enabled model paired with the same source, for ≤ supported prior courses | Recovery from other sources; more prior courses than the model supports |
| Interval conditions and interval-banded records | Missing dates, fractions, metrics or PRV/structure data |

## Fictional demo cases
| Case | Scenario |
|---|---|
| FICT-BR-001 | Fully evaluable; within selected constraints (8 of 8) |
| FICT-BR-002 | Constraint exceedance (brainstem) |
| FICT-HN-001 | Missing boost fractionation and an incompatible metric (D0.03cc vs Dmax/D0.1cc) |
| FICT-HN-002 | Reference disagreement (metric, α/β, threshold, PRV, scope); recovery-adjusted switch |
| FICT-HN-003 | Two prior courses; the recovery model is not extended; carotid has no evaluable constraint |

The demo cases use only verified literature records. Synthetic test thresholds live in
`src/evidence/fixtures/synthetic-test-thresholds.json`. They are marked **SOFTWARE TEST FIXTURE** and are hidden unless a case opts in.

## Evidence
- Dataset: `src/evidence/data/evidence.json` (v1.0.0, search date 2026-10-29), built from `evidence/extraction/` plus `evidence/curation.json`.
- Protocol and gaps: [`docs/SEARCH_PROTOCOL.md`](docs/SEARCH_PROTOCOL.md). Coverage per organ: [`docs/EVIDENCE_COVERAGE.md`](docs/EVIDENCE_COVERAGE.md).
- There are 53 enabled checks from 66 sources. Many template organs have **no** enabled check, including normal brain, carotid, mandible and temporal lobe.
  Several key guidance documents are paywalled, so their numbers were not extracted.
- To contribute evidence, see [`docs/CONTRIBUTING_EVIDENCE.md`](docs/CONTRIBUTING_EVIDENCE.md).

## Validation status
See [`docs/VALIDATION_STATUS.md`](docs/VALIDATION_STATUS.md).
The engine and UI have been software-tested, and the evidence quotes have been machine-checked against the full texts.
**No independent clinical or medical-physics validation has been done.**

## Known limitations
- No DVH import, deformable registration or voxel-wise dose accumulation.
- The LQ model assumes equal dose per fraction at the evaluated metric. It is unreliable for very high dose per fraction.
- Literature values often come from small retrospective series or single-institution protocols.
- Coverage is not exhaustive.
- Calculation methods: [`docs/CALCULATIONS.md`](docs/CALCULATIONS.md). Worked examples: [`tests/worked-examples.md`](tests/worked-examples.md).

## Privacy
Do not enter real patient data. Case data stays in the browser. `.gitignore` excludes exported case files (`*.rert.json`, `rert-cases-*.json`).

## License
MIT for the code. Quoted excerpts in the evidence files belong to their authors and publishers and are cited for research purposes.
Full texts are not redistributed.
