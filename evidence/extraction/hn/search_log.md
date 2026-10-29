# HN reirradiation OAR constraints: search log (2026-10-29)

## Databases / tools
- Europe PMC REST search (`/webservices/rest/search`, JSON) and `/{PMCID}/fullTextXML`
- PMC HTML (pmc.ncbi.nlm.nih.gov) for two NIH author manuscripts that have no Europe PMC fullTextXML (Garg 2016, Gebhardt 2018)
- Frontiers publisher HTML (Guan 2024)
- Cardiff ORCA (Woolley 2018): record page only, no PDF
- One WebSearch, used only to find the Woolley repository

## Exact queries (Europe PMC)
1. `(reirradiation OR re-irradiation) AND "head and neck" AND (carotid OR "cumulative dose") AND OPEN_ACCESS:Y`: 1372 hits, first 25 screened
2. `(reirradiation OR re-irradiation) AND nasopharyngeal AND ("temporal lobe" OR "cumulative") AND OPEN_ACCESS:Y`: 961 hits, 25 screened
3. `"spinal cord" AND (reirradiation OR re-irradiation) AND (BED OR EQD2) AND OPEN_ACCESS:Y`: 1481 hits, 25 screened (most were spine/lung, so excluded)
4. `TITLE:(carotid) AND (reirradiation OR re-irradiation OR reirradiated)`: 129 hits, 30 screened
5. `TITLE:("temporal lobe") AND (reirradiation OR re-irradiation OR "second course")`: 25 hits, all screened
6. `"brachial plexus" AND (reirradiation OR re-irradiation) AND "head and neck"`: 349 hits, 15 screened
7. `AUTH:"Nieder C" AND "spinal cord" AND (reirradiation OR retreatment)`: 12 hits, all screened
8. `("MIRI" OR "Multi-Institution Reirradiation") AND head and neck`: 362 hits, 20 screened (mostly noise)
9. `nasopharyngeal AND (reirradiation OR re-irradiation) AND ("dose constraint" OR "dose constraints" OR "cumulative EQD2" OR "cumulative dose") AND OPEN_ACCESS:Y`: 452 hits, 30 screened
10. `AUTH:"Embring A"`: 27 hits, 10 screened
11. `(reirradiation OR re-irradiation) AND (osteoradionecrosis OR mandible) AND "head and neck" AND OPEN_ACCESS:Y AND ("cumulative dose" OR EQD2)`: 192 hits, 15 screened
12. `(reirradiation OR re-irradiation) AND "head and neck" AND ("spinal cord" AND "brainstem") AND ("cumulative" AND EQD2) AND OPEN_ACCESS:Y`: 43 hits, 25 screened
13. Title lookups: QUANTEC spinal cord (Kirkpatrick 2010), Woolley 2018
14. DOI lookups for these references: Ng 2021, Hague 2024, Nieder 2005/2006/2018/2019, Embring 2020, Garg 2016, Bots 2017, Dibs 2025, Grimm 2021, Liu 2014, Yilmaz 2025, Guan 2024

## Inclusion / exclusion
- Included: original HN or NPC reirradiation studies that state OAR dose constraints they applied, or cumulative-dose and toxicity associations, with full text saved locally.
- Excluded from extraction:
  - The 5 general guidance documents (another agent covers them)
  - Reviews and secondary summaries. Nieder values were quoted in Nash 2025, but we did not extract them from there.
  - Spine, lung and pelvis reirradiation
  - Achieved-dose tables with no limit or association
- Disease scope is kept separate. NPC records say "nasopharyngeal" and HNSCC records say HNSCC/HN. Carbon-ion and SBRT records are labelled by modality and fractionation.

## Full-text handling
- The JATS XML and HTML files were converted to .txt by stripping tags and normalising unicode spaces such as thin and no-break spaces. The scripts that do this are in `scratchpad/hn_tools/`. Quotes refer to the .txt files and were machine-checked: 0 failures after whitespace normalisation.

## Wanted but not accessed (abstract-only or inaccessible)
- **Spinal cord:**
  - Nieder 2005 and 2006 (IJROBP). These hold the core cumulative-BED and interval rules.
  - Nieder 2019 (Phys Med; 25% recovery at 6 months, 50% at 12 months)
  - Kirkpatrick 2010 QUANTEC
  - Woolley 2018 recovery model
  - Nieder 2018 repeat reirradiation (spine)
  - Sahgal 2012 reirradiation SBRT
  - Result: no spinal cord recovery model comes from a primary full text. The only recovery models captured are the institutional ones listed in `recovery_models.json`.
- **NPC:**
  - Ng 2021 international recommendations (IJROBP). The values cited from it in Lin 2024 are flagged ambiguous.
  - Liu 2014 temporal lobe injury after re-IMRT (J Neurooncol)
- **MIRI collaborative:** Ward 2018 and Caudell 2018 (IJROBP). These were not found as OA and the DOIs were not checked individually, which is a gap.
- **Carotid and SBRT:** Grimm 2021 HyTEC pooling, Yilmaz 2025, and Yamazaki/Yazici CyberKnife carotid blowout series were not retrieved.
- **Brachial plexus:** Dibs 2025 (Radiother Oncol), abstract only.

## Coverage gaps
- Pharyngeal constrictors, parotid and skin/soft tissue: no reirradiation-specific numeric constraint was found in accessible full text.
- Larynx: only one course-only Dmean goal (Nanda 2025).
- Brachial plexus: only a value cited secondarily from Ng 2021 (ambiguous) plus the Dibs abstract.
- Optic structures: Held 2019 (carbon ion), Ho 2020 (NPC SBRT) and Lin 2024 (secondary).
- Temporal lobe: NTCP TD5/TD50 values only (Guan 2024 and 2026), recorded as observed associations.
