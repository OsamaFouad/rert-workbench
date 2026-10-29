# Brain / CNS reirradiation OAR evidence: search log

Date: 2026-10-29. Agent scope: brain/CNS reirradiation OAR constraints (brainstem, optic chiasm/nerves, normal brain/necrosis, retina, spinal cord only in brain context); diseases GBM/HGG, LGG, meningioma, brain metastases re-SRS, ependymoma, paediatric. The 5 general guidance documents are out of scope (separate agent).

## Database
Europe PMC REST API (`/europepmc/webservices/rest/search`), full text via `/{PMCID}/fullTextXML`. XML converted to tag-stripped text (`sources/<key>.txt`, quote source); original XML kept as `sources/<key>.xml`.

## Queries (exact strings)
1. `(reirradiation OR re-irradiation) AND (brainstem OR chiasm OR "optic") AND (cumulative OR EQD2 OR BED) AND OPEN_ACCESS:Y`: 2083 hits, first 40 screened by title
2. `TITLE:"reirradiation tolerance" OR TITLE:"re-irradiation tolerance" OR (Mayer AND Sminia AND necrosis)`: 37 hits, all screened
3. `(TITLE:reirradiation OR TITLE:re-irradiation) AND (TITLE:brainstem OR TITLE:"optic" OR TITLE:chiasm OR TITLE:necrosis OR TITLE:"dose constraints")`: 26 hits, all screened
4. `("cumulative EQD2" OR "cumulative dose" OR "cumulative BED") AND (brainstem OR chiasm OR "optic apparatus") AND (reirradiation OR re-irradiation) AND OPEN_ACCESS:Y AND (glioma OR meningioma OR ependymoma OR metastases)`: 244 hits, first 30 screened
5. `Scoccianti AND re-irradiation AND glioblastoma AND "literature review"`: 9 hits
6. `(re-irradiation OR reirradiation) AND (DIPG OR "diffuse intrinsic pontine") AND (cumulative OR EQD2) AND OPEN_ACCESS:Y`: 120 hits, first 25 screened
7. `(reirradiation OR re-irradiation) AND (meningioma OR "pituitary") AND ("optic neuropathy" OR chiasm) AND (cumulative OR EQD2 OR BED) AND OPEN_ACCESS:Y`: 261 hits, first 25 screened
8. `("repeat radiosurgery" OR "repeat SRS" OR "re-SRS" OR "salvage SRS") AND "brain metastases" AND ("V12" OR "cumulative" OR "composite") AND necrosis AND OPEN_ACCESS:Y`: 125 hits, first 25 screened
9. Reference follow-up (DOI lookups) of refs cited in ESTRO CNS 2026, De Pietro 2023, Minniti 2021: Mayer & Sminia 2008, Niyazi 2013, Stiefel 2021, Milano HyTEC 2021, McGovern 2023, PENTEC 2024, Waxweiler 2017, Marciscano 2026.

About 250 titles screened in total; 22 full texts downloaded and read or grepped.

## Inclusion / exclusion
- Included: full-text sources reporting numeric OAR dose limits, planning goals, or dose–toxicity associations for CNS OARs in a reirradiation setting (cumulative or reirradiation-course-only).
- Excluded from records: primary-course-only tolerance data (QUANTEC/HyTEC single-course values) unless restated in a reirradiation context; target prescription doses; case reports with case-level cumulative doses only; head and neck reirradiation (temporal lobe in NPC belongs to the HN agent).
- Observed "no toxicity up to X" or "risk <10% at X" statements are recorded as `observed-toxicity-association`, not limits.

## Wanted but not accessible
- McGovern SL et al. 2023, Pract Radiat Oncol, 10.1016/j.prro.2022.12.006. This is the prospective composite RT1+RT2 constraint study. It is the highest-value missing source.
- Ajithkumar T et al. 2024 PENTEC reirradiation brain/brainstem necrosis, IJROBP, 10.1016/j.ijrobp.2023.12.043
- Mayer R, Sminia P 2008, IJROBP, 10.1016/j.ijrobp.2007.08.015 (OA 2012 update used instead)
- Waxweiler TV et al. 2017, Pediatr Blood Cancer, 10.1002/pbc.26341 (paediatric hypofractionated brainstem re-RT)
- Marciscano AE et al. 2026, Radiother Oncol, 10.1016/j.radonc.2025.111101 (brainstem FSRT reirradiation)
- Milano MT et al. 2021, HyTEC optic pathways, PMC9479557 (Europe PMC fullTextXML returned HTTP 500)
- Scoccianti S et al. 2018, Crit Rev Oncol Hematol, 10.1016/j.critrevonc.2018.03.024 (volume-dependent cumulative brain recommendation; cited only second-hand by Stiefel, so not extracted)

## Coverage gaps
- No OA source gives validated cumulative limits for optic nerves/chiasm. The only items are institutional per-course values (LeCompte: 24 Gy re-RT max if prior was about 50–54 Gy; ependymoma/meningioma per-course 54 Gy) and observed maxima without toxicity (Niyazi, Stiefel, LeCompte).
- Brainstem: institutional cumulative point-dose constraint of 100 Gy (physical sum; LeCompte 2025, HGG), a paediatric proton planning goal of D0.1cc < 86 Gy(RBE) and V80 < 1 cc (n=11), and observed associations. Brainstem α/β labelling is inconsistent in Stiefel.
- Normal brain: only literature-level cumulative prescription EQD2 associations (about 100–110 Gy for <10% risk, >130 Gy for about 25%), not DVH-based limits.
- Re-SRS for brain metastases: no OA source gave cumulative normal-brain volumetric (V12-type) limits specific to repeat SRS.
- Cochlea, hippocampus, lens: no reirradiation-specific data found. Retina: one per-course planning value (meningioma TMPRT).
- LGG: no specific data. Paediatric: PENTEC is abstract-only; MedAustron proton series used.
- Recovery: no CNS-specific validated time-dependent factor table. Recorded models are Niyazi's uniform r=0.5 (descriptive), the Ang primate spinal-cord recovery percentages cited in De Pietro 2023 (retained fractions derived), and qualitative statements.

## Ambiguities flagged
- Reviews (De Pietro 2023, Minniti 2021) cite Niyazi's 80.3/79.4/95.2 Gy values as "EQD2". The primary paper (Table 3) gives them as uncorrected sums of maximum doses in Gy.
- Stiefel 2021: the Methods give α/β 2 Gy for brainstem and optic nerves, but Table 2 labels these values Gy3.
- Sminia & Mayer 2012: "should not be not exceeded" (100 Gy, TMZ context) is a double-negative typo. The record is marked ambiguous.
- De Pietro 2023: "150 Gy brain / 120 Gy spine" for medulloblastoma cites spinal cord references. The record is marked ambiguous.
