// Case-level evaluation: which checks are required, how many are evaluable, and the roll-up status.

import { evaluateCheck, intervalApplicability, type CheckResult } from './evaluate';
import type { Constraint, EvidenceDataset, Oar, ReviewCase, Status } from './types';

export interface ListedRecord {
  oar: Oar;
  constraint: Constraint;
  /** Why it is shown but not evaluated. */
  reason: string;
}

export interface CaseEvaluation {
  results: CheckResult[];
  /** Records of the selected references that are shown but not evaluated (unverified, observed association, out of band...). */
  listed: ListedRecord[];
  /** OARs that have no evaluable constraint in the selected references. */
  uncoveredOars: Oar[];
  /** Number of required checks (either-or alternatives count once). */
  required: number;
  evaluable: number;
  counts: Record<Status, number>;
  overall: Status;
  coverageText: string;
}

/** Constraints that can become checks (methodological "other" records are excluded). */
export function checkConstraints(data: EvidenceDataset, c: ReviewCase, sourceKeys: string[]): Constraint[] {
  return data.constraints.filter(
    (k) => sourceKeys.includes(k.sourceKey) && k.category !== 'other' && (!k.isTestFixture || c.includeTestFixtures),
  );
}

export function constraintsForOar(all: Constraint[], oar: Oar): Constraint[] {
  return all.filter((k) => k.organKeys.includes(oar.organKey));
}

/** Why a record is not a required automated check, or null if it is one. */
export function notEvaluatedReason(k: Constraint): string | null {
  if (k.category === 'observed-toxicity-association') return 'Observed toxicity association: shown for comparison, not evaluated as a tolerance limit.';
  if (!k.automatedEvaluation) {
    if (k.extractionStatus === 'not-extracted-fulltext-unavailable') return 'Full text not accessible: numerical value not extracted.';
    if (k.extractionStatus === 'ambiguous') return 'Extraction ambiguous (see notes): unavailable for automated evaluation.';
    return 'Incomplete specification (metric, dose quantity, α/β or inequality): unavailable for automated evaluation.';
  }
  return null;
}

/** Roll up either-or alternatives: met if any alternative is within; exceeded only if all alternatives were evaluated and exceeded. */
function groupStatus(rs: CheckResult[]): Status {
  if (rs.some((r) => r.status === 'within')) return 'within';
  if (rs.every((r) => r.status === 'exceeds')) return 'exceeds';
  if (rs.some((r) => r.status === 'review')) return 'review';
  return 'insufficient';
}

export function evaluateCase(c: ReviewCase, data: EvidenceDataset, sourceKeys = c.selectedSourceKeys): CaseEvaluation {
  const pool = checkConstraints(data, c, sourceKeys);
  const results: CheckResult[] = [];
  const listed: ListedRecord[] = [];
  const uncoveredOars: Oar[] = [];

  for (const oar of c.oars) {
    let evaluated = 0;
    for (const k of constraintsForOar(pool, oar)) {
      // A PRV-only (or structure-only) record is skipped for this entry when the case has the matching entry for the same organ.
      if (k.structureOrPRV !== 'unspecified' && k.structureOrPRV !== oar.designation) {
        const sibling = c.oars.some((o) => o.organKey === oar.organKey && o.laterality === oar.laterality && o.designation === k.structureOrPRV);
        if (sibling) continue;
      }
      const why = notEvaluatedReason(k);
      if (why) {
        listed.push({ oar, constraint: k, reason: why });
        continue;
      }
      if (k.intervalRole === 'applicability' && intervalApplicability(c, k) === 'out') {
        listed.push({ oar, constraint: k, reason: `Not applicable: record covers a different interval band (${k.intervalCondition}).` });
        continue;
      }
      results.push(evaluateCheck(c, oar, k, data.recoveryModels));
      evaluated++;
    }
    if (evaluated === 0) uncoveredOars.push(oar);
  }

  // Count checks, collapsing either-or alternatives (same OAR, same group) into one required check.
  const units = new Map<string, CheckResult[]>();
  for (const r of results) {
    const k = pool.find((x) => x.id === r.constraintId)!;
    const key = k.alternativeGroup ? `${r.oarId}::${k.sourceKey}::${k.alternativeGroup}` : r.key;
    units.set(key, [...(units.get(key) ?? []), r]);
  }
  const counts: Record<Status, number> = { within: 0, exceeds: 0, insufficient: 0, review: 0 };
  for (const rs of units.values()) counts[rs.length === 1 ? rs[0].status : groupStatus(rs)] += 1;
  const required = units.size;
  const evaluable = counts.within + counts.exceeds;

  // Any missing/unsupported check prevents an all-green result.
  let overall: Status;
  if (counts.exceeds > 0) overall = 'exceeds';
  else if (required > 0 && counts.within === required) overall = 'within';
  else if (counts.review > 0) overall = 'review';
  else overall = 'insufficient';

  const coverageText =
    `${evaluable} of ${required} required check${required === 1 ? '' : 's'} evaluable` +
    (uncoveredOars.length ? `; ${uncoveredOars.length} OAR(s) without an evaluable constraint in the selected references` : '');
  return { results, listed, uncoveredOars, required, evaluable, counts, overall, coverageText };
}
