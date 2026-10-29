// Explains, per OAR, why no "maximum allowed" (calculated headroom) can be shown, in plain words.

import { canonicalMetric, checkConstraints, constraintsForOar, notEvaluatedReason, type CheckResult, type Oar, type ReviewCase } from '../engine';
import { EVIDENCE } from '../evidence';

/** Metrics used by the evaluable limits of the selected references for this organ. */
export function referenceMetrics(c: ReviewCase, oar: Oar): string[] {
  const ks = constraintsForOar(checkConstraints(EVIDENCE, c, c.selectedSourceKeys), oar).filter((k) => notEvaluatedReason(k) === null);
  return Array.from(new Set(ks.map((k) => canonicalMetric(k.metric)))).sort();
}

export function enteredPriorMetrics(c: ReviewCase, oar: Oar): string[] {
  const ms = c.courses.flatMap((co) => co.phases.flatMap((p) => p.doses)).filter((d) => d.oarId === oar.id && d.value !== null);
  return Array.from(new Set(ms.map((d) => canonicalMetric(d.metric))));
}

export function noMaximumReason(c: ReviewCase, oar: Oar, results: CheckResult[]): string | null {
  const mine = results.filter((r) => r.oarId === oar.id);
  if (mine.some((r) => r.physicalCeiling)) return null;
  const needed = referenceMetrics(c, oar);
  if (needed.length === 0) {
    return c.selectedSourceKeys.length === 0
      ? 'No maximum: no reference is selected (step 4, Evidence Comparison).'
      : 'No maximum: none of the selected references has an evaluable limit for this organ.';
  }
  const entered = enteredPriorMetrics(c, oar);
  if (!needed.some((m) => entered.includes(m))) {
    return (
      `No maximum: the selected references set limits on ${needed.join(' or ')}, but the previous dose was entered as ` +
      `${entered.join(', ') || 'nothing'}. Add a ${needed.join(' or ')} row in step 3 (OAR Data). Metrics are not substituted for each other.`
    );
  }
  if (!c.proposed.fractions) return 'No maximum: enter the number of fractions for the new plan (top of this page).';
  const reason = mine.flatMap((r) => r.reasons).find((x) => x.level === 'insufficient' || x.level === 'review');
  return `No maximum yet: ${reason?.message ?? 'previous-course data incomplete.'}`;
}
