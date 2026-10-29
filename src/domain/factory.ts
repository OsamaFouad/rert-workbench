import type { Course, DoseEntry, Oar, Phase, ReviewCase } from '../engine';
import { pathwayByKey } from './templates';

export const uid = (p = 'id') => `${p}-${Math.random().toString(36).slice(2, 10)}`;

export function newPhase(label = 'Phase 1'): Phase {
  return { id: uid('ph'), label, startDate: null, endDate: null, fractions: null, prescriptionDoseGy: null, technique: '', modality: 'photon', doses: [] };
}

export function newCourse(n: number): Course {
  return { id: uid('co'), label: `Course ${n}`, phases: [newPhase()], notes: '' };
}

export function oarsFromTemplate(pathway: string): Oar[] {
  return (pathwayByKey(pathway)?.oars ?? []).map((t) => ({
    id: uid('oar'),
    organKey: t.organKey,
    name: t.name,
    laterality: t.laterality,
    designation: 'structure',
    prvMarginMm: null,
    summationBasis: 'not-documented',
    notes: '',
  }));
}

export function newCase(pathway: string, caseLabel: string, now: string, sourceKeys: string[]): ReviewCase {
  return {
    schemaVersion: 1,
    id: uid('case'),
    caseLabel,
    pathway,
    disease: { description: '', diseaseKeys: [], setting: '', intent: '' },
    oars: oarsFromTemplate(pathway),
    courses: [newCourse(1)],
    proposed: { plannedStartDate: null, fractions: null, prescriptionDoseGy: null, technique: '', modality: 'photon', doses: [] },
    notes: { missingInformation: '', anatomicalChanges: '', overlapUncertainty: '', general: '' },
    selectedSourceKeys: sourceKeys,
    primarySourceKey: sourceKeys[0] ?? null,
    statusBasis: 'unadjusted',
    includeTestFixtures: false,
    createdAt: now,
    updatedAt: now,
  };
}

/** Set the dose entry for (oar, metric). A null value is kept as an explicit "not entered" entry. */
export function upsertDose(doses: DoseEntry[], oarId: string, metric: string, value: number | null, unit: DoseEntry['unit'] = 'Gy'): DoseEntry[] {
  const i = doses.findIndex((d) => d.oarId === oarId && d.metric === metric);
  if (i < 0) return value === null ? doses : [...doses, { id: uid('d'), oarId, metric, value, unit }];
  const next = doses.slice();
  next[i] = { ...next[i], value, unit };
  return next;
}

export function duplicateCase(c: ReviewCase, now: string): ReviewCase {
  const copy: ReviewCase = structuredClone(c);
  copy.id = uid('case');
  copy.caseLabel = `${c.caseLabel} (copy)`;
  copy.createdAt = now;
  copy.updatedAt = now;
  return copy;
}
