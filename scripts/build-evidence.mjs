#!/usr/bin/env node
// Builds src/evidence/data/evidence.json from the raw extraction files (evidence/extraction/<region>/)
// plus the documented curation decisions in evidence/curation.json.
// Rule: a record is enabled for automated evaluation only if it is verified from full text, has a numeric
// threshold with an upper-bound inequality, a canonical metric, an α/β for biological quantities, and is not
// an observed toxicity association or a methodological note. Curation may only switch evaluation OFF,
// or record documented interpretations (with a _why) — never add numbers.
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const cur = JSON.parse(readFileSync(join(root, 'evidence/curation.json'), 'utf8'));
const exDir = join(root, 'evidence/extraction');
const CANON = /^(Dmax|Dmean|D\d+(\.\d+)?cc|D\d+(\.\d+)?%|V\d+(\.\d+)?Gy)$/;

const overrideFor = (map, id) => {
  const out = {};
  for (const [pat, o] of Object.entries(map)) {
    const hit = pat.endsWith('*') ? id.startsWith(pat.slice(0, -1)) : id === pat;
    if (hit) Object.assign(out, o);
  }
  delete out._why;
  return out;
};

const sources = [];
const constraints = [];
const recoveryModels = [];
const problems = [];

for (const region of readdirSync(exDir).sort()) {
  const dir = join(exDir, region);
  if (!existsSync(join(dir, 'sources.json'))) continue;
  const regions = cur.regionsByExtractionDir[region];
  for (const s of JSON.parse(readFileSync(join(dir, 'sources.json'), 'utf8'))) {
    if (sources.some((x) => x.key === s.key)) continue;
    sources.push({
      key: s.key,
      title: s.title,
      authors: s.authors,
      year: s.year,
      journal: s.journal ?? '',
      doi: s.doi ?? '',
      url: s.url ?? '',
      accessStatus: s.accessStatus,
      accessedDate: s.accessedDate,
      scope: s.scope ?? '',
      evidenceType: s.evidenceType ?? '',
      regions,
      notes: s.notes ?? '',
    });
  }
  for (const r of JSON.parse(readFileSync(join(dir, 'constraints.json'), 'utf8'))) {
    const o = overrideFor(cur.constraintOverrides, r.id);
    const organKeys = cur.organKeyMap[r.organ] ?? [r.organ];
    const disease = cur.diseaseScopeBySource[r.sourceKey];
    if (r.category !== 'other' && !disease) problems.push(`no diseaseScope mapping for ${r.sourceKey}`);
    const metric = r.metric ?? 'unspecified';
    const inequality = ['<', '<=', '>', '>='].includes(r.inequality) ? r.inequality : 'unspecified';
    const k = {
      id: r.id,
      sourceKey: r.sourceKey,
      location: r.location ?? '',
      regions,
      organKeys,
      structureOrPRV: ['structure', 'PRV'].includes(r.structureOrPRV) ? r.structureOrPRV : 'unspecified',
      metric,
      doseQuantity: ['EQD2', 'BED', 'physical'].includes(r.doseQuantity) ? r.doseQuantity : 'physical',
      doseQuantityStated: ['EQD2', 'BED', 'physical'].includes(r.doseQuantity),
      unit: 'Gy',
      inequality,
      threshold: typeof r.threshold === 'number' ? r.threshold : null,
      thresholdText: r.thresholdText ?? '',
      alphaBeta: typeof r.alphaBeta === 'number' ? r.alphaBeta : null,
      alphaBetaSource: r.alphaBetaSource ?? '',
      scope: ['cumulative', 'per-course', 'reirradiation-course-only'].includes(r.scope) ? r.scope : 'unspecified',
      category: r.category,
      diseaseScope: disease ?? ['unspecified'],
      setting: [r.disease, r.setting].filter(Boolean).join(' — '),
      endpoint: r.endpoint ?? '',
      fractionationApplicability: r.fractionationApplicability ?? '',
      minIntervalMonths: null,
      maxIntervalMonths: null,
      intervalRole: 'condition',
      intervalCondition: r.intervalCondition ?? '',
      alternativeGroup: null,
      physicalSumDefinedBySource: false,
      conditionText: '',
      recoveryAssumption: r.recoveryAssumption ?? '',
      recoveryIncludedInLimit: typeof r.recoveryIncludedInLimit === 'boolean' ? r.recoveryIncludedInLimit : null,
      evidenceType: r.evidenceType ?? '',
      limitations: r.limitations ?? '',
      extractionStatus: r.extractionStatus,
      automatedEvaluation: false,
      quote: r.quote ?? null,
      notes: r.notes ?? '',
      ...o,
    };
    const eligible =
      k.extractionStatus === 'verified-fulltext' &&
      k.quote &&
      k.threshold !== null &&
      (k.inequality === '<' || k.inequality === '<=') &&
      CANON.test(k.metric) &&
      k.doseQuantityStated &&
      (k.doseQuantity === 'physical' || k.alphaBeta !== null) &&
      !['other', 'observed-toxicity-association'].includes(k.category);
    k.automatedEvaluation = o.automatedEvaluation === false ? false : Boolean(eligible);
    delete k.doseQuantityStated;
    constraints.push(k);
  }
  const rmFile = join(dir, 'recovery_models.json');
  if (existsSync(rmFile)) {
    for (const m of JSON.parse(readFileSync(rmFile, 'utf8'))) {
      const o = overrideFor(cur.recoveryModelOverrides, m.id);
      recoveryModels.push({
        id: m.id,
        sourceKey: m.sourceKey,
        location: m.location ?? '',
        organKeys: o.organKeys ?? [],
        organText: m.organ ?? '',
        setting: m.setting ?? '',
        maxPriorCourses: o.maxPriorCourses ?? m.maxPriorCourses ?? 1,
        appliesTo: m.appliesTo === 'BED' ? 'BED' : 'EQD2',
        factorTable: (m.factorTable ?? []).filter((b) => typeof b.intervalMonthsMin === 'number'),
        description: m.intervalRule ?? '',
        quote: m.quote ?? null,
        extractionStatus: m.extractionStatus,
        enabled: o.enabled === true,
        pairedSourceKeys: o.pairedSourceKeys ?? [],
        notes: m.notes ?? '',
      });
    }
  }
}

if (problems.length) {
  console.error([...new Set(problems)].join('\n'));
  process.exit(1);
}
const out = {
  datasetVersion: cur.datasetVersion,
  searchDate: cur.searchDate,
  description: cur.description,
  sources,
  constraints,
  recoveryModels,
};
writeFileSync(join(root, 'src/evidence/data/evidence.json'), JSON.stringify(out, null, 2) + '\n');
const en = constraints.filter((k) => k.automatedEvaluation);
console.log(`sources ${sources.length}, records ${constraints.length}, enabled ${en.length}, recovery models ${recoveryModels.length} (enabled ${recoveryModels.filter((m) => m.enabled).length})`);
