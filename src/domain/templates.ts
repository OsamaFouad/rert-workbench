// Pathway OAR templates. Being listed here does NOT mean a validated reirradiation constraint exists;
// coverage comes only from the evidence dataset. Adding a region = adding an entry here + tagging evidence.

import type { Laterality } from '../engine';

export interface TemplateOar {
  organKey: string;
  name: string;
  laterality: Laterality;
  defaultMetric: string;
}

export interface Pathway {
  key: string;
  name: string;
  description: string;
  oars: TemplateOar[];
}

const pair = (organKey: string, name: string, metric: string): TemplateOar[] => [
  { organKey, name: `${name} (L)`, laterality: 'left', defaultMetric: metric },
  { organKey, name: `${name} (R)`, laterality: 'right', defaultMetric: metric },
];

export const PATHWAYS: Pathway[] = [
  {
    key: 'brain',
    name: 'Brain / CNS',
    description: 'Intracranial reirradiation (e.g. recurrent glioma, meningioma, re-SRS).',
    oars: [
      { organKey: 'brainstem', name: 'Brainstem', laterality: 'midline', defaultMetric: 'D0.03cc' },
      { organKey: 'optic-chiasm', name: 'Optic chiasm', laterality: 'midline', defaultMetric: 'D0.03cc' },
      ...pair('optic-nerve', 'Optic nerve', 'D0.03cc'),
      { organKey: 'brain', name: 'Brain (minus target)', laterality: 'bilateral', defaultMetric: 'Dmean' },
      ...pair('cochlea', 'Cochlea', 'Dmean'),
      ...pair('retina', 'Retina', 'D0.03cc'),
      ...pair('lens', 'Lens', 'D0.03cc'),
      ...pair('hippocampus', 'Hippocampus', 'Dmean'),
      { organKey: 'spinal-cord', name: 'Spinal cord', laterality: 'midline', defaultMetric: 'D0.03cc' },
    ],
  },
  {
    key: 'head-neck',
    name: 'Head & Neck',
    description: 'Recurrent or second-primary head and neck cancer, including nasopharynx.',
    oars: [
      { organKey: 'spinal-cord', name: 'Spinal cord', laterality: 'midline', defaultMetric: 'D0.03cc' },
      { organKey: 'brainstem', name: 'Brainstem', laterality: 'midline', defaultMetric: 'D0.03cc' },
      ...pair('carotid-artery', 'Carotid artery', 'Dmax'),
      { organKey: 'mandible', name: 'Mandible', laterality: 'bilateral', defaultMetric: 'D0.03cc' },
      { organKey: 'larynx', name: 'Larynx', laterality: 'midline', defaultMetric: 'Dmean' },
      { organKey: 'pharyngeal-constrictors', name: 'Pharyngeal constrictors', laterality: 'midline', defaultMetric: 'Dmean' },
      ...pair('brachial-plexus', 'Brachial plexus', 'D0.03cc'),
      ...pair('temporal-lobe', 'Temporal lobe', 'D0.03cc'),
      { organKey: 'optic-chiasm', name: 'Optic chiasm', laterality: 'midline', defaultMetric: 'D0.03cc' },
      ...pair('optic-nerve', 'Optic nerve', 'D0.03cc'),
      ...pair('parotid', 'Parotid', 'Dmean'),
      { organKey: 'oral-cavity', name: 'Oral cavity', laterality: 'midline', defaultMetric: 'Dmean' },
      { organKey: 'skin', name: 'Skin', laterality: 'not-applicable', defaultMetric: 'D0.03cc' },
    ],
  },
];

export const ORGAN_LABELS: Record<string, string> = {
  brainstem: 'Brainstem',
  'optic-chiasm': 'Optic chiasm',
  'optic-nerve': 'Optic nerve',
  'optic-apparatus': 'Optic apparatus',
  brain: 'Brain',
  cochlea: 'Cochlea',
  retina: 'Retina',
  lens: 'Lens',
  hippocampus: 'Hippocampus',
  'spinal-cord': 'Spinal cord',
  'carotid-artery': 'Carotid artery',
  mandible: 'Mandible',
  larynx: 'Larynx',
  'pharyngeal-constrictors': 'Pharyngeal constrictors',
  'brachial-plexus': 'Brachial plexus',
  'temporal-lobe': 'Temporal lobe',
  parotid: 'Parotid',
  'oral-cavity': 'Oral cavity',
  skin: 'Skin',
  custom: 'Custom organ',
};

export const DISEASE_KEYS: { key: string; label: string }[] = [
  { key: 'glioblastoma', label: 'Glioblastoma' },
  { key: 'high-grade-glioma', label: 'High-grade glioma (non-GBM)' },
  { key: 'low-grade-glioma', label: 'Low-grade glioma' },
  { key: 'meningioma', label: 'Meningioma' },
  { key: 'brain-metastases', label: 'Brain metastases' },
  { key: 'ependymoma', label: 'Ependymoma' },
  { key: 'paediatric-cns', label: 'Paediatric CNS tumour' },
  { key: 'hnscc', label: 'Head & neck SCC' },
  { key: 'nasopharyngeal-carcinoma', label: 'Nasopharyngeal carcinoma' },
  { key: 'other', label: 'Other' },
];

export function pathwayByKey(key: string): Pathway | undefined {
  return PATHWAYS.find((p) => p.key === key);
}
