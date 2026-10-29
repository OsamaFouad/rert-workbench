// Clearly fictional demo cases. All enabled checks use verified literature records from the evidence dataset;
// no synthetic fixtures are used here. Doses are invented teaching values, not patient data.

import type { Course, DoseEntry, Modality, Oar, ReviewCase, SummationBasis } from '../engine';

const T = '2026-10-29T00:00:00.000Z';

function oar(id: string, organKey: string, name: string, extra: Partial<Oar> = {}): Oar {
  return {
    id,
    organKey,
    name,
    laterality: 'midline',
    designation: 'structure',
    prvMarginMm: null,
    summationBasis: 'conservative-worst-case' as SummationBasis,
    notes: '',
    ...extra,
  };
}

/** doses: [oarId, metric, value] */
function doses(prefix: string, list: [string, string, number | null][]): DoseEntry[] {
  return list.map(([oarId, metric, value], i) => ({ id: `${prefix}-d${i}`, oarId, metric, value, unit: 'Gy' }));
}

function course(
  id: string,
  label: string,
  phases: { label: string; start: string; end: string; fx: number | null; rx: number; technique?: string; modality?: Modality; doses: [string, string, number | null][] }[],
  notes = '',
): Course {
  return {
    id,
    label,
    notes,
    phases: phases.map((p, i) => ({
      id: `${id}-p${i + 1}`,
      label: p.label,
      startDate: p.start,
      endDate: p.end,
      fractions: p.fx,
      prescriptionDoseGy: p.rx,
      technique: p.technique ?? 'VMAT',
      modality: p.modality ?? 'photon',
      doses: doses(`${id}-p${i + 1}`, p.doses),
    })),
  };
}

function base(over: Partial<ReviewCase> & Pick<ReviewCase, 'id' | 'caseLabel' | 'pathway' | 'disease' | 'oars' | 'courses' | 'proposed'>): ReviewCase {
  return {
    schemaVersion: 1,
    notes: { missingInformation: '', anatomicalChanges: '', overlapUncertainty: '', general: '' },
    selectedSourceKeys: [],
    primarySourceKey: null,
    statusBasis: 'unadjusted',
    includeTestFixtures: false,
    createdAt: T,
    updatedAt: T,
    ...over,
  };
}

export function buildDemoCases(): ReviewCase[] {
  // 1. Brain — fully evaluable, within selected constraints
  const br1 = base({
    id: 'demo-br-001',
    caseLabel: 'FICT-BR-001 Within selected constraints',
    pathway: 'brain',
    disease: {
      description: 'Fictional adult with recurrent glioblastoma, right temporal lobe, 3 years after chemoradiotherapy.',
      diseaseKeys: ['glioblastoma'],
      setting: 'In-field recurrence; proposed hypofractionated reirradiation.',
      intent: 'Demo: all selected checks evaluable.',
    },
    oars: [
      oar('br1-bs', 'brainstem', 'Brainstem'),
      oar('br1-ch', 'optic-chiasm', 'Optic chiasm'),
      oar('br1-onl', 'optic-nerve', 'Optic nerve (L)', { laterality: 'left' }),
      oar('br1-onr', 'optic-nerve', 'Optic nerve (R)', { laterality: 'right' }),
    ],
    courses: [
      course('br1-c1', 'Course 1 (2021)', [
        {
          label: 'Chemoradiotherapy',
          start: '2021-03-01',
          end: '2021-04-12',
          fx: 30,
          rx: 60,
          doses: [
            ['br1-bs', 'Dmax', 52], ['br1-bs', 'D0.1cc', 50],
            ['br1-ch', 'Dmax', 50], ['br1-ch', 'D0.1cc', 48],
            ['br1-onl', 'Dmax', 46], ['br1-onl', 'D0.1cc', 44],
            ['br1-onr', 'Dmax', 38], ['br1-onr', 'D0.1cc', 36],
          ],
        },
      ]),
    ],
    proposed: {
      plannedStartDate: '2024-05-06',
      fractions: 10,
      prescriptionDoseGy: 35,
      technique: 'VMAT',
      modality: 'photon',
      doses: doses('br1-pr', [
        ['br1-bs', 'Dmax', 18], ['br1-bs', 'D0.1cc', 17],
        ['br1-ch', 'Dmax', 10], ['br1-ch', 'D0.1cc', 9],
        ['br1-onl', 'Dmax', 8], ['br1-onl', 'D0.1cc', 7.5],
        ['br1-onr', 'Dmax', 6], ['br1-onr', 'D0.1cc', 5.5],
      ]),
    },
    notes: {
      missingInformation: '',
      anatomicalChanges: 'Mild post-surgical cavity shift.',
      overlapUncertainty: 'Rigid registration only; near-max points assumed co-located (conservative).',
      general: '',
    },
    selectedSourceKeys: ['hgg-frac-reirt-2025', 'paradis-2019-consult-appendixE2'],
    primarySourceKey: 'hgg-frac-reirt-2025',
  });

  // 2. Brain — constraint exceedance
  const br2 = base({
    id: 'demo-br-002',
    caseLabel: 'FICT-BR-002 Exceedance',
    pathway: 'brain',
    disease: {
      description: 'Fictional adult with recurrent glioblastoma adjacent to the brainstem, 2 years after first course.',
      diseaseKeys: ['glioblastoma'],
      setting: 'Recurrence abutting brainstem.',
      intent: 'Demo: cumulative brainstem dose exceeds the selected limits.',
    },
    oars: [oar('br2-bs', 'brainstem', 'Brainstem'), oar('br2-ch', 'optic-chiasm', 'Optic chiasm')],
    courses: [
      course('br2-c1', 'Course 1 (2020)', [
        {
          label: 'Chemoradiotherapy',
          start: '2020-01-06',
          end: '2020-02-14',
          fx: 30,
          rx: 60,
          doses: [['br2-bs', 'Dmax', 61], ['br2-bs', 'D0.1cc', 59], ['br2-ch', 'Dmax', 30], ['br2-ch', 'D0.1cc', 28]],
        },
      ]),
    ],
    proposed: {
      plannedStartDate: '2022-03-01',
      fractions: 15,
      prescriptionDoseGy: 45,
      technique: 'VMAT',
      modality: 'photon',
      doses: doses('br2-pr', [['br2-bs', 'Dmax', 41], ['br2-bs', 'D0.1cc', 39], ['br2-ch', 'Dmax', 12], ['br2-ch', 'D0.1cc', 11]]),
    },
    selectedSourceKeys: ['hgg-frac-reirt-2025', 'paradis-2019-consult-appendixE2'],
    primarySourceKey: 'hgg-frac-reirt-2025',
  });

  // 3. Head & Neck — missing fractionation and incompatible metric
  const hn1 = base({
    id: 'demo-hn-001',
    caseLabel: 'FICT-HN-001 Missing data / incompatible metric',
    pathway: 'head-neck',
    disease: {
      description: 'Fictional second primary oropharyngeal SCC after prior laryngeal SCC radiotherapy.',
      diseaseKeys: ['hnscc'],
      setting: 'Second primary in previously irradiated neck.',
      intent: 'Demo: boost fraction count unknown; spinal cord exported as D0.03cc only.',
    },
    oars: [
      oar('hn1-cordprv', 'spinal-cord', 'Spinal cord PRV', { designation: 'PRV', prvMarginMm: 5 }),
      oar('hn1-bsprv', 'brainstem', 'Brainstem PRV', { designation: 'PRV', prvMarginMm: 3 }),
    ],
    courses: [
      course('hn1-c1', 'Course 1 (2019)', [
        { label: 'Phase 1', start: '2019-02-04', end: '2019-03-08', fx: 25, rx: 50, doses: [['hn1-cordprv', 'D0.03cc', 44], ['hn1-bsprv', 'Dmax', 30]] },
        { label: 'Boost', start: '2019-03-11', end: '2019-03-22', fx: null, rx: 20, doses: [['hn1-cordprv', 'D0.03cc', 3], ['hn1-bsprv', 'Dmax', 2]] },
      ]),
    ],
    proposed: {
      plannedStartDate: '2023-10-02',
      fractions: 30,
      prescriptionDoseGy: 60,
      technique: 'IMRT',
      modality: 'photon',
      doses: doses('hn1-pr', [['hn1-cordprv', 'D0.03cc', 12], ['hn1-bsprv', 'Dmax', 6]]),
    },
    notes: {
      missingInformation: 'Boost fraction count not in archived summary. Spinal cord DVH exported only as D0.03cc.',
      anatomicalChanges: 'Weight loss ~8 kg since first course.',
      overlapUncertainty: 'Old plan only available as PDF summary.',
      general: '',
    },
    selectedSourceKeys: ['nash-2025-cord-brainstem-audit', 'paradis-2019-consult-appendixE2'],
    primarySourceKey: 'nash-2025-cord-brainstem-audit',
  });

  // 4. Head & Neck — disagreement between references
  const hn2 = base({
    id: 'demo-hn-002',
    caseLabel: 'FICT-HN-002 Reference disagreement',
    pathway: 'head-neck',
    disease: {
      description: 'Fictional recurrent oral cavity SCC, 3+ years after adjuvant radiotherapy.',
      diseaseKeys: ['hnscc'],
      setting: 'Unresectable local recurrence.',
      intent: 'Demo: references differ in metric, α/β, threshold, structure/PRV and per-course vs cumulative definitions.',
    },
    oars: [
      oar('hn2-cord', 'spinal-cord', 'Spinal cord'),
      oar('hn2-cordprv', 'spinal-cord', 'Spinal cord PRV', { designation: 'PRV', prvMarginMm: 5 }),
      oar('hn2-bsprv', 'brainstem', 'Brainstem PRV', { designation: 'PRV', prvMarginMm: 3 }),
    ],
    courses: [
      course('hn2-c1', 'Course 1 (2020)', [
        {
          label: 'Adjuvant',
          start: '2020-01-06',
          end: '2020-02-21',
          fx: 33,
          rx: 66,
          doses: [
            ['hn2-cord', 'Dmax', 44], ['hn2-cord', 'D0.1cc', 42.5],
            ['hn2-cordprv', 'Dmax', 47], ['hn2-cordprv', 'D0.1cc', 45.5],
            ['hn2-bsprv', 'Dmax', 40], ['hn2-bsprv', 'D0.1cc', 38.5],
          ],
        },
      ]),
    ],
    proposed: {
      plannedStartDate: '2023-06-05',
      fractions: 30,
      prescriptionDoseGy: 60,
      technique: 'VMAT',
      modality: 'photon',
      doses: doses('hn2-pr', [
        ['hn2-cord', 'Dmax', 14], ['hn2-cord', 'D0.1cc', 13],
        ['hn2-cordprv', 'Dmax', 16], ['hn2-cordprv', 'D0.1cc', 18],
        ['hn2-bsprv', 'Dmax', 8], ['hn2-bsprv', 'D0.1cc', 7.5],
      ]),
    },
    notes: {
      missingInformation: 'Brainstem structure (non-PRV) doses not exported.',
      anatomicalChanges: '',
      overlapUncertainty: 'Cord hotspot level C2–C3 in both plans (documented on plan review).',
      general: 'Switch status basis to recovery-adjusted to see the paired Paradis 2019 discount (single prior course).',
    },
    selectedSourceKeys: ['nash-2025-cord-brainstem-audit', 'paradis-2019-consult-appendixE2', 'nanda-2025-hnscc-pet-reirr'],
    primarySourceKey: 'nash-2025-cord-brainstem-audit',
  });
  hn2.oars.forEach((o) => (o.summationBasis = 'documented-overlap'));

  // 5. Head & Neck — multiple prior courses; recovery-adjusted basis requested but unsupported
  const hn3 = base({
    id: 'demo-hn-003',
    caseLabel: 'FICT-HN-003 Two prior courses, unsupported recovery',
    pathway: 'head-neck',
    disease: {
      description: 'Fictional third head and neck SCC course: larynx 2012, hypopharynx 2018, new recurrence 2024.',
      diseaseKeys: ['hnscc'],
      setting: 'Third course to overlapping neck region.',
      intent: 'Demo: recovery models are not extended beyond one prior course.',
    },
    oars: [
      oar('hn3-cordprv', 'spinal-cord', 'Spinal cord PRV', { designation: 'PRV', prvMarginMm: 5 }),
      oar('hn3-car', 'carotid-artery', 'Carotid artery (L)', { laterality: 'left' }),
    ],
    courses: [
      course('hn3-c1', 'Course 1 (2012)', [
        { label: 'Larynx', start: '2012-04-02', end: '2012-05-18', fx: 35, rx: 70, doses: [['hn3-cordprv', 'Dmax', 45], ['hn3-cordprv', 'D0.1cc', 43.5], ['hn3-car', 'Dmax', 68]] },
      ]),
      course('hn3-c2', 'Course 2 (2018)', [
        { label: 'Hypopharynx', start: '2018-09-03', end: '2018-10-12', fx: 30, rx: 60, doses: [['hn3-cordprv', 'Dmax', 30], ['hn3-cordprv', 'D0.1cc', 28.5], ['hn3-car', 'Dmax', 55]] },
      ]),
    ],
    proposed: {
      plannedStartDate: '2024-09-02',
      fractions: 25,
      prescriptionDoseGy: 50,
      technique: 'VMAT',
      modality: 'photon',
      doses: doses('hn3-pr', [['hn3-cordprv', 'Dmax', 10], ['hn3-cordprv', 'D0.1cc', 9.5], ['hn3-car', 'Dmax', 40]]),
    },
    notes: {
      missingInformation: '',
      anatomicalChanges: 'Laryngectomy after course 1.',
      overlapUncertainty: 'Course 1 plan reconstructed from archive; cord level overlap assumed (conservative).',
      general: '',
    },
    selectedSourceKeys: ['nash-2025-cord-brainstem-audit', 'paradis-2019-consult-appendixE2'],
    primarySourceKey: 'paradis-2019-consult-appendixE2',
    statusBasis: 'recovery-adjusted',
  });

  return [br1, br2, hn1, hn2, hn3];
}
