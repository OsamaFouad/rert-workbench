# Independently worked examples

Hand calculations used as test oracles (`tests/unit/*.test.ts`). IDs match test names.

**W1** — 60 Gy / 30 fx, α/β 2: d = 2; BED = 60 × (1 + 2/2) = 120; EQD2 = 120 / (1 + 2/2) = 60.

**W2** — 30 Gy / 10 fx, α/β 2: d = 3; BED = 30 × 2.5 = 75; EQD2 = 75 / 2 = 37.5.

**W3** — 30 Gy / 10 fx, α/β 3: BED = 30 × (1 + 3/3) = 60; EQD2 = 60 / (5/3) = 36.

**W4** — Mixed fractionation, two courses, α/β 2.
Course 1: 50 Gy/25 fx → EQD2 50; boost 10 Gy/5 fx → EQD2 10; course total 60.
Course 2: 30 Gy/10 fx → 37.5. Prior = 97.5. Proposed 20 Gy/10 fx → 20. Cumulative 117.5 > 100 → exceeds; headroom 2.5.
Intervals: 2018-03-10 → 2024-01-15 = 2137 days; 2021-06-01 → 2024-01-15 = 958 days (separately per course).

**W5** — Headroom 100 − 60 = 40 Gy EQD2 (α/β 2), n = 10. BED_h = 40 × 2 = 80.
D = (10·2/2)(√(1 + 4·80/20) − 1) = 10(√17 − 1) = 31.2311 Gy. Check: d = 3.1231; BED = 31.2311 × 2.5616 = 80.0.

**W6** — Limit 50, prior 60 → headroom −10 (existing exceedance); ceiling 0; status exceeds even with proposed dose missing.

**W7** — Boundary: EQD2 exactly 60 vs limit 60: "≤" → within; "<" → exceeds. 60 vs 60.0001 with "<" → within; 60 vs 59.99999 with "≤" → exceeds (full precision).

**W8** — Dates: 2020-02-28 → 2021-02-28 = 366 days (includes 2020-02-29) = 12.0246 months (÷ 30.4375). 2023-02-30 is rejected.

**W9** — α/β change: 30 Gy/10 fx → EQD2 37.5 (α/β 2) vs 36 (α/β 3) for two references.

**W10** — Synthetic recovery fixture (retained 0.5 at ≥ 12 months), cord D0.03cc, α/β 2: prior 60/30 → 60; interval 366 d → 0.5 → adjusted 30. Proposed 10/5 → d = 2 → EQD2 10. Unadjusted 70 > 60 (exceeds); adjusted 40 ≤ 60 (within).

**W11** — Same fixture model, two prior courses → not applicable (model supports one prior course).

**W12** — Limit with recovery already included → no discount (no double counting).

## Demo-case oracles (literature values)
**BR-001** Paradis 2019 brainstem D0.1cc ≤ 64 Gy EQD2, α/β 2.5. Prior 50 Gy/30 fx: d = 1.6667; BED = 50 × (1 + 0.6667) = 83.333; EQD2 = 83.333 / 1.8 = 46.296.
Proposed 17 Gy/10 fx: d = 1.7; BED = 17 × 1.68 = 28.56; EQD2 = 15.867. Total 62.163 ≤ 64 → within.
Interval 2021-04-12 → 2024-05-06 = 1120 d = 36.8 months → Paradis discount 50% → adjusted prior 23.148.
LeCompte 2025 brainstem: physical sum 52 + 18 = 70 ≤ 100 → within.

**BR-002** LeCompte physical sum 61 + 41 = 102 > 100 → exceeds.

**HN-002** Nash 2025 cord PRV Dmax ≤ 60 Gy EQD2, α/β 2: prior 47/33: d = 1.4242; BED = 47 × 1.7121 = 80.47; EQD2 = 40.23. Proposed 16/30: d = 0.5333; BED = 20.27; EQD2 = 10.13. Total 50.37 → within.
Paradis cord D0.1cc ≤ 50, α/β 2.5: prior 45.5/33 → EQD2 39.22; proposed 18/30 → d = 0.6, BED = 18 × 1.24 = 22.32, EQD2 = 12.40. Total 51.62 → exceeds.
With the paired recovery discount (interval 1200 d = 39.4 mo → 50%): 19.61 + 12.40 = 32.01 → within.

**HN-003** Nash cord PRV Dmax: 45/35 → 36.96; 30/30 → 22.5; 10/25 → 6.0. Total 65.46 > 60 (exceeds), ≤ 67.75 (within).
Intervals: 2012-05-18 → 2024-09-02 = 4490 d; 2018-10-12 → 2024-09-02 = 2152 d. Paradis model limited to one prior course → unadjusted only.
