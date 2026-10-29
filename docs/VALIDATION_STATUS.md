# Validation status

| Layer | Status | Evidence |
|---|---|---|
| Calculation engine | Software-tested | 54 unit tests (Vitest) incl. independently hand-worked examples (`tests/worked-examples.md`) |
| User interface flows | Software-tested | 7 end-to-end tests (Playwright): create/edit/duplicate/delete, reference switch, recalculation, import/export, persistence, report, RTL glossary |
| Evidence extraction | Source-extracted, machine-verified quotes | 161 quotes matched against downloaded full text; curation decisions logged in `evidence/curation.json` |
| Clinical validation | **Not performed** | No radiation oncologist has independently reviewed the dataset or outputs |
| Medical-physics validation | **Not performed** | No comparison with a treatment planning system or deformable dose accumulation |
| Regulatory | Not a medical device | Research and educational use with fictional cases only |

Software testing shows the code does what it is specified to do. Source extraction shows the numbers match the papers.
Neither shows that the numbers or methods are appropriate for any patient.
