#!/usr/bin/env node
// Generates docs/EVIDENCE_COVERAGE.md from the built evidence dataset.
import { readFileSync, writeFileSync } from 'node:fs';

const d = JSON.parse(readFileSync('src/evidence/data/evidence.json', 'utf8'));
const templates = {
  'Brain / CNS': ['brainstem', 'optic-chiasm', 'optic-nerve', 'brain', 'cochlea', 'retina', 'lens', 'hippocampus', 'spinal-cord'],
  'Head & Neck': ['spinal-cord', 'brainstem', 'carotid-artery', 'mandible', 'larynx', 'pharyngeal-constrictors', 'brachial-plexus', 'temporal-lobe', 'optic-chiasm', 'optic-nerve', 'parotid', 'oral-cavity', 'skin'],
};
const checks = d.constraints.filter((k) => k.category !== 'other');
const row = (organ) => {
  const ks = checks.filter((k) => k.organKeys.includes(organ));
  const en = ks.filter((k) => k.automatedEvaluation);
  const obs = ks.filter((k) => k.category === 'observed-toxicity-association');
  const na = ks.filter((k) => k.extractionStatus !== 'verified-fulltext');
  const srcs = [...new Set(en.map((k) => k.sourceKey))].join(', ') || '—';
  const gap = en.length === 0 ? '**GAP: no enabled check**' : '';
  return `| ${organ} | ${en.length} | ${obs.length} | ${na.length} | ${ks.length} | ${srcs} ${gap} |`;
};
let md = `# Evidence coverage report

Generated from \`src/evidence/data/evidence.json\` (dataset v${d.datasetVersion}, search date ${d.searchDate}) by \`npm run coverage\`.

This is **not** an exhaustive review. Numbers are enabled only when verified verbatim against accessible full text.
A template organ with zero enabled checks means *this dataset* has no usable reirradiation constraint for it — not that none exists.

Columns: **Enabled** = automated checks; **Observed** = observed toxicity associations (shown, never evaluated as limits);
**Not extracted** = paywalled/abstract-only/ambiguous; **All** = every non-methodological record.

`;
for (const [name, organs] of Object.entries(templates)) {
  md += `## ${name} template\n\n| Organ | Enabled | Observed | Not extracted | All | Sources with enabled checks |\n|---|---:|---:|---:|---:|---|\n`;
  md += organs.map(row).join('\n') + '\n\n';
}
md += `## Totals\n\n- Sources: ${d.sources.length} (full text: ${d.sources.filter((s) => s.accessStatus === 'fulltext-oa').length}; abstract-only/inaccessible: ${d.sources.filter((s) => s.accessStatus !== 'fulltext-oa').length})\n`;
md += `- Records: ${d.constraints.length}; enabled for automated evaluation: ${d.constraints.filter((k) => k.automatedEvaluation).length}\n`;
md += `- Recovery models listed: ${d.recoveryModels.length}; enabled (paired with same-source limits only): ${d.recoveryModels.filter((m) => m.enabled).map((m) => m.id).join(', ') || 'none'}\n\n`;
md += `## Sources not accessible (numbers not extracted)\n\n`;
for (const s of d.sources.filter((s) => s.accessStatus !== 'fulltext-oa')) md += `- ${s.authors} (${s.year}). ${s.title}. ${s.doi ? 'doi:' + s.doi : s.url} — ${s.accessStatus}\n`;
md += `\n## Enabled records\n\n| Record | Organ | Constraint | α/β | Scope | Category | Population | Location |\n|---|---|---|---|---|---|---|---|\n`;
for (const k of d.constraints.filter((k) => k.automatedEvaluation)) {
  md += `| ${k.id} | ${k.organKeys.join(', ')} | ${k.metric} ${k.inequality} ${k.threshold} Gy ${k.doseQuantity} | ${k.alphaBeta ?? '—'} | ${k.scope} | ${k.category} | ${k.diseaseScope.join(', ')} | ${k.location.replace(/\|/g, '/')} |\n`;
}
writeFileSync('docs/EVIDENCE_COVERAGE.md', md);
console.log('wrote docs/EVIDENCE_COVERAGE.md');
