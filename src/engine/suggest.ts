// Ranks references by how well they fit a case: population, organs covered, and how many checks the
// entered data can already evaluate. Thresholds are deliberately NOT used, so a reference is never
// preferred for being more permissive.

import { canonicalMetric } from './metrics';
import { evaluateCase, notEvaluatedReason } from './summary';
import type { EvidenceDataset, ReviewCase } from './types';

export type PopulationFit = 'match' | 'general' | 'mismatch';

export interface ReferenceSuggestion {
  sourceKey: string;
  population: PopulationFit;
  /** Case OARs that have at least one evaluable limit in this reference. */
  organsCovered: string[];
  /** Checks that are evaluable now with the entered data (within or exceeds). */
  evaluableNow: number;
  /** Checks this reference would create for the case. */
  checks: number;
  /** OARs where the reference uses a metric the user has not entered. */
  missingMetrics: { oarName: string; metrics: string[] }[];
  recommended: boolean;
  reasons: string[];
}

const POP_RANK: Record<PopulationFit, number> = { match: 0, general: 1, mismatch: 2 };

export function suggestReferences(c: ReviewCase, data: EvidenceDataset, sourceKeys: string[]): ReferenceSuggestion[] {
  const entered = (oarId: string) =>
    new Set(
      [...c.courses.flatMap((co) => co.phases.flatMap((p) => p.doses)), ...c.proposed.doses]
        .filter((d) => d.oarId === oarId && d.value !== null)
        .map((d) => canonicalMetric(d.metric)),
    );

  const out: ReferenceSuggestion[] = [];
  for (const key of sourceKeys) {
    const ks = data.constraints.filter((k) => k.sourceKey === key && notEvaluatedReason(k) === null && (!k.isTestFixture || c.includeTestFixtures));
    if (ks.length === 0) continue;

    const scopes = ks.flatMap((k) => k.diseaseScope);
    const population: PopulationFit = scopes.some((d) => c.disease.diseaseKeys.includes(d))
      ? 'match'
      : scopes.includes('any')
        ? 'general'
        : 'mismatch';

    const organsCovered: string[] = [];
    const missingMetrics: ReferenceSuggestion['missingMetrics'] = [];
    for (const o of c.oars) {
      const mine = ks.filter((k) => k.organKeys.includes(o.organKey));
      if (mine.length === 0) continue;
      organsCovered.push(o.name);
      const have = entered(o.id);
      const needed = Array.from(new Set(mine.map((k) => canonicalMetric(k.metric))));
      if (!needed.some((m) => have.has(m))) missingMetrics.push({ oarName: o.name, metrics: needed });
    }

    const ev = evaluateCase(c, data, [key]);
    const reasons: string[] = [];
    if (population === 'match') reasons.push('population matches the case disease');
    else if (population === 'general') reasons.push('cross-site / not disease-specific');
    else reasons.push(`different population (${Array.from(new Set(scopes)).join(', ')})`);
    reasons.push(`covers ${organsCovered.length} of ${c.oars.length} OARs`);
    reasons.push(`${ev.evaluable} of ${ev.required} checks evaluable with entered data`);

    out.push({
      sourceKey: key,
      population,
      organsCovered,
      evaluableNow: ev.evaluable,
      checks: ev.required,
      missingMetrics,
      recommended: population !== 'mismatch' && organsCovered.length > 0,
      reasons,
    });
  }

  return out.sort(
    (a, b) =>
      POP_RANK[a.population] - POP_RANK[b.population] ||
      b.evaluableNow - a.evaluableNow ||
      b.organsCovered.length - a.organsCovered.length ||
      a.sourceKey.localeCompare(b.sourceKey),
  );
}
