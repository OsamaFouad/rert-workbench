# Calculation methods

All calculation code is in `src/engine/` (pure TypeScript, no UI). Tests: `tests/unit/`. Worked examples: `tests/worked-examples.md`.

## Linear-quadratic conversion (equal fractions)
For each phase separately, with D = physical dose at the evaluated OAR metric and n = fractions:

```
d    = D / n                       (equal dose per fraction at the evaluated point — an assumption)
BED  = D × (1 + d / (α/β))
EQD2 = BED / (1 + 2 / (α/β))
```

- The **target prescription is never used** as an OAR dose; it is a separate, context-only field.
- α/β comes from the reference record and is fixed within that reference's scenario. Each reference is recomputed with its own α/β.
- Biological doses of phases/courses are summed only after per-phase conversion. Schedules are never averaged.

## When summation across phases/courses is allowed
| Situation | Behaviour |
|---|---|
| Near-max metric (Dmax, D≤1cc, D≤2%) and summation basis documented or "conservative worst-case" | Summed; labelled *conservative estimate, not spatially registered dose accumulation* |
| Summation basis "not documented" | **Requires review** |
| Larger dose-volume metrics (e.g. D2cc), Dmean, Vx | **Requires review** (no scalar mean EQD2, no Vx summation) |
| Physical-dose cumulative limits | **Requires review**, unless the source itself defines a simple physical sum (`physicalSumDefinedBySource`) |
| Proton, carbon, brachytherapy, radionuclide, other | **Requires review** (no automatic RBE / dose-rate modelling) |

Metrics are matched by exact canonical name. Dmax, D0.03cc, D0.1cc and D1cc are never substituted for each other.

## Intervals
Per prior course: end of course (latest phase end date; missing → unknown) to planned start of the proposed course.
Months = days / 30.4375. Each course has its own interval; no shared interval is applied.

## Recovery
- The unadjusted result is always shown.
- A recovery-adjusted scenario is offered only if an **enabled** model exists for the organ, it is **paired with the same source** as the limit,
  every interval falls inside its table, the number of prior courses is ≤ the model's supported count, and the limit does not already include recovery.
- Adjusted prior = Σ (retained fraction × prior course EQD2 or BED). Physical Gy is never reduced.
- Statuses use the unadjusted value unless the user selects the recovery-adjusted basis *and* a model applies.

## Headroom and conditional physical ceiling
```
Headroom (EQD2) = selected cumulative limit − evaluated prior EQD2
BED_h = Headroom × (1 + 2/(α/β))
D_ceiling = (n·α/β / 2) × (√(1 + 4·BED_h/(n·α/β)) − 1)        for n proposed fractions
```
Shown as *calculated headroom under selected assumptions* — never a prescribed or guaranteed-safe dose.
Negative headroom is kept and flagged as an existing exceedance.

## Statuses
| Status | Meaning |
|---|---|
| Within selected constraints | Evaluated value satisfies the inequality at full precision under stated assumptions. Not clinical clearance. |
| Exceeds selected constraints | Evaluated value violates the inequality, or prior courses alone already do. |
| Insufficient data | Missing dose, fractions, dates or matching metric/designation; or value not available for automated evaluation. |
| Requires review | Calculation possible only under unsupported assumptions (population mismatch, modality, mean/Vx, undocumented overlap, interval condition, unspecified scope). |

Case result: "N of M required checks evaluable". Required checks = enabled records of the selected references for the case's OARs
(either-or alternatives count once; interval-banded records outside the case's band are listed as not applicable).
Any insufficient/review check prevents an all-green case result.
