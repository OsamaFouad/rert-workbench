import fixtures from '../../src/evidence/fixtures/synthetic-test-thresholds.json';
import type { Constraint, Course, EvidenceDataset, Oar, ReviewCase } from '../../src/engine';

export const FIX = fixtures as unknown as EvidenceDataset;
export const k = (id: string): Constraint => {
  const c = FIX.constraints.find((x) => x.id === id);
  if (!c) throw new Error(id);
  return structuredClone(c);
};

export function oar(organKey: string, over: Partial<Oar> = {}): Oar {
  return {
    id: `oar-${organKey}`,
    organKey,
    name: organKey,
    laterality: 'midline',
    designation: 'structure',
    prvMarginMm: null,
    summationBasis: 'conservative-worst-case',
    notes: '',
    ...over,
  };
}

/** phases: [D, n, endDate, metric?] */
export function course(id: string, oarId: string, phases: [number | null, number | null, string | null, string?][]): Course {
  return {
    id,
    label: id,
    notes: '',
    phases: phases.map(([D, n, end, metric], i) => ({
      id: `${id}-p${i + 1}`,
      label: `Phase ${i + 1}`,
      startDate: null,
      endDate: end,
      fractions: n,
      prescriptionDoseGy: 99, // deliberately different: must never be used as OAR dose
      technique: 'VMAT',
      modality: 'photon',
      doses: D === null && metric === undefined ? [] : [{ id: `${id}-d${i}`, oarId, metric: metric ?? 'Dmax', value: D, unit: 'Gy' }],
    })),
  };
}

export function mkCase(o: Oar, courses: Course[], proposed: { D: number | null; n: number | null; start: string | null; metric?: string }, over: Partial<ReviewCase> = {}): ReviewCase {
  return {
    schemaVersion: 1,
    id: 'test',
    caseLabel: 'FICT-TEST',
    pathway: 'brain',
    disease: { description: '', diseaseKeys: ['glioblastoma'], setting: '', intent: '' },
    oars: [o],
    courses,
    proposed: {
      plannedStartDate: proposed.start,
      fractions: proposed.n,
      prescriptionDoseGy: 99,
      technique: 'VMAT',
      modality: 'photon',
      doses: proposed.D === null ? [] : [{ id: 'pd', oarId: o.id, metric: proposed.metric ?? 'Dmax', value: proposed.D, unit: 'Gy' }],
    },
    notes: { missingInformation: '', anatomicalChanges: '', overlapUncertainty: '', general: '' },
    selectedSourceKeys: ['fixture-a', 'fixture-b'],
    primarySourceKey: 'fixture-a',
    statusBasis: 'unadjusted',
    includeTestFixtures: true,
    createdAt: '2026-10-29T00:00:00Z',
    updatedAt: '2026-10-29T00:00:00Z',
    ...over,
  };
}
