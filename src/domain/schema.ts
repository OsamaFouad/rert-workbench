// zod schema for importing cases. Unknown or malformed files are rejected with a readable error.

import { z } from 'zod';
import type { ReviewCase } from '../engine';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable();
const num = z.number().finite().nullable();
const modality = z.enum(['photon', 'electron', 'proton', 'carbon-ion', 'brachytherapy-hdr', 'brachytherapy-ldr-pdr', 'radionuclide', 'other']);

const dose = z.object({
  id: z.string(),
  oarId: z.string(),
  metric: z.string(),
  value: num,
  unit: z.enum(['Gy', '%', 'cc']),
  note: z.string().optional(),
});

const phase = z.object({
  id: z.string(),
  label: z.string(),
  startDate: date,
  endDate: date,
  fractions: num,
  prescriptionDoseGy: num,
  technique: z.string(),
  modality,
  doses: z.array(dose),
});

export const caseSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string(),
  caseLabel: z.string(),
  pathway: z.string(),
  disease: z.object({ description: z.string(), diseaseKeys: z.array(z.string()), setting: z.string(), intent: z.string() }),
  oars: z.array(
    z.object({
      id: z.string(),
      organKey: z.string(),
      name: z.string(),
      laterality: z.enum(['left', 'right', 'midline', 'bilateral', 'not-applicable']),
      designation: z.enum(['structure', 'PRV']),
      prvMarginMm: num,
      summationBasis: z.enum(['not-documented', 'documented-overlap', 'conservative-worst-case']),
      notes: z.string(),
    }),
  ),
  courses: z.array(z.object({ id: z.string(), label: z.string(), phases: z.array(phase), notes: z.string() })),
  proposed: z.object({
    plannedStartDate: date,
    fractions: num,
    prescriptionDoseGy: num,
    technique: z.string(),
    modality,
    doses: z.array(dose),
  }),
  notes: z.object({ missingInformation: z.string(), anatomicalChanges: z.string(), overlapUncertainty: z.string(), general: z.string() }),
  selectedSourceKeys: z.array(z.string()),
  primarySourceKey: z.string().nullable(),
  statusBasis: z.enum(['unadjusted', 'recovery-adjusted']),
  includeTestFixtures: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const exportFileSchema = z.object({
  format: z.literal('rert-workbench-cases'),
  appVersion: z.string(),
  evidenceVersion: z.string(),
  exportedAt: z.string(),
  cases: z.array(caseSchema),
});

export type ExportFile = z.infer<typeof exportFileSchema>;

export function parseImport(text: string): { ok: true; cases: ReviewCase[] } | { ok: false; error: string } {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: 'File is not valid JSON.' };
  }
  const file = exportFileSchema.safeParse(json);
  if (file.success) return { ok: true, cases: file.data.cases as ReviewCase[] };
  const single = caseSchema.safeParse(json);
  if (single.success) return { ok: true, cases: [single.data as ReviewCase] };
  const issue = file.error.issues[0];
  return { ok: false, error: `Not a ReRT Workbench export: ${issue.path.join('.') || '(root)'} — ${issue.message}` };
}
