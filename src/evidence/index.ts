// Evidence loader. The literature dataset and the synthetic fixtures live in separate files and are
// merged only at runtime, with every fixture record carrying isTestFixture: true.

import type { Constraint, EvidenceDataset, Source } from '../engine';
import literature from './data/evidence.json';
import fixtures from './fixtures/synthetic-test-thresholds.json';

export const LITERATURE = literature as unknown as EvidenceDataset;
export const FIXTURES = fixtures as unknown as EvidenceDataset;

export const EVIDENCE: EvidenceDataset = {
  ...LITERATURE,
  sources: [...LITERATURE.sources, ...FIXTURES.sources],
  constraints: [...LITERATURE.constraints, ...FIXTURES.constraints],
  recoveryModels: [...LITERATURE.recoveryModels, ...FIXTURES.recoveryModels],
};

export const EVIDENCE_VERSION = LITERATURE.datasetVersion;
export const SOURCE_BY_KEY = new Map<string, Source>(EVIDENCE.sources.map((s) => [s.key, s]));
export const CONSTRAINT_BY_ID = new Map<string, Constraint>(EVIDENCE.constraints.map((k) => [k.id, k]));

export function sourceLabel(key: string): string {
  const s = SOURCE_BY_KEY.get(key);
  if (!s) return key;
  const first = (s.authors.split(',')[0] ?? '').trim().replace(/\s+[A-Z]{1,3}\.?$/, '') || s.title;
  const etAl = s.authors.includes(',') ? ' et al.' : '';
  return s.isTestFixture ? s.title : `${first}${etAl} ${s.year}`;
}

/** Sources that have at least one check-type record (numeric or listed-but-unavailable) for the pathway. */
export function sourcesForPathway(pathway: string, includeFixtures: boolean): Source[] {
  return EVIDENCE.sources.filter(
    (s) =>
      (includeFixtures || !s.isTestFixture) &&
      (s.regions.includes(pathway) || s.regions.includes('general')) &&
      EVIDENCE.constraints.some((k) => k.sourceKey === s.key && k.category !== 'other'),
  );
}
