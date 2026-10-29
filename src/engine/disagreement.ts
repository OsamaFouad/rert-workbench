// Explains why two references give different answers for the same OAR. Never averages or picks a "winner".

import type { CheckResult } from './evaluate';
import type { Constraint } from './types';

export type DifferenceKind = 'threshold' | 'metric' | 'dose-quantity' | 'alpha-beta' | 'scope' | 'recovery' | 'population' | 'category' | 'structure-prv';

export interface Disagreement {
  oarId: string;
  a: { constraintId: string; sourceKey: string; status: CheckResult['status'] };
  b: { constraintId: string; sourceKey: string; status: CheckResult['status'] };
  statusDiffers: boolean;
  differences: { kind: DifferenceKind; detail: string }[];
}

export function compareConstraints(a: Constraint, b: Constraint): Disagreement['differences'] {
  const out: Disagreement['differences'] = [];
  const fmt = (k: Constraint) => `${k.inequality} ${k.threshold ?? 'n/a'} Gy ${k.doseQuantity}`;
  if (a.threshold !== b.threshold || a.inequality !== b.inequality) out.push({ kind: 'threshold', detail: `${fmt(a)} vs ${fmt(b)}` });
  if (a.metric !== b.metric) out.push({ kind: 'metric', detail: `${a.metric} vs ${b.metric}` });
  if (a.doseQuantity !== b.doseQuantity) out.push({ kind: 'dose-quantity', detail: `${a.doseQuantity} vs ${b.doseQuantity}` });
  if (a.alphaBeta !== b.alphaBeta) out.push({ kind: 'alpha-beta', detail: `α/β ${a.alphaBeta ?? 'n/a'} vs ${b.alphaBeta ?? 'n/a'} Gy` });
  if (a.scope !== b.scope) out.push({ kind: 'scope', detail: `${a.scope} vs ${b.scope}` });
  if (a.recoveryIncludedInLimit !== b.recoveryIncludedInLimit || a.minIntervalMonths !== b.minIntervalMonths)
    out.push({
      kind: 'recovery',
      detail: `recovery in limit: ${a.recoveryIncludedInLimit ?? 'not stated'} vs ${b.recoveryIncludedInLimit ?? 'not stated'}; min interval ${a.minIntervalMonths ?? '—'} vs ${b.minIntervalMonths ?? '—'} months`,
    });
  if (a.diseaseScope.join() !== b.diseaseScope.join())
    out.push({ kind: 'population', detail: `${a.diseaseScope.join(', ')} vs ${b.diseaseScope.join(', ')}` });
  if (a.category !== b.category) out.push({ kind: 'category', detail: `${a.category} vs ${b.category}` });
  if (a.structureOrPRV !== b.structureOrPRV) out.push({ kind: 'structure-prv', detail: `${a.structureOrPRV} vs ${b.structureOrPRV}` });
  return out;
}

export function findDisagreements(results: CheckResult[], constraints: Map<string, Constraint>): Disagreement[] {
  const byOar = new Map<string, CheckResult[]>();
  for (const r of results) byOar.set(r.oarId, [...(byOar.get(r.oarId) ?? []), r]);
  const out: Disagreement[] = [];
  for (const [oarId, rs] of byOar) {
    for (let i = 0; i < rs.length; i++) {
      for (let j = i + 1; j < rs.length; j++) {
        const ra = rs[i];
        const rb = rs[j];
        if (ra.sourceKey === rb.sourceKey) continue;
        const ka = constraints.get(ra.constraintId);
        const kb = constraints.get(rb.constraintId);
        if (!ka || !kb) continue;
        const differences = compareConstraints(ka, kb);
        const statusDiffers = ra.status !== rb.status;
        if (differences.length === 0 && !statusDiffers) continue;
        out.push({
          oarId,
          a: { constraintId: ra.constraintId, sourceKey: ra.sourceKey, status: ra.status },
          b: { constraintId: rb.constraintId, sourceKey: rb.sourceKey, status: rb.status },
          statusDiffers,
          differences,
        });
      }
    }
  }
  return out;
}
