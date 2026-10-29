#!/usr/bin/env node
// Re-downloads open-access full texts (Europe PMC fullTextXML) into a local cache so that
// scripts/verify-quotes.mjs can be re-run. Full texts are NOT committed to this repository.
// Sources without a PMCID (publisher HTML saved via a browser, PDFs, preprints) are listed for manual retrieval.
//
// Usage: node scripts/fetch-sources.mjs [cache-dir]
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const cache = process.argv[2] ?? '.fulltext-cache';
const ex = 'evidence/extraction';
const manual = [];
for (const region of readdirSync(ex)) {
  const f = join(ex, region, 'sources.json');
  if (!existsSync(f)) continue;
  mkdirSync(join(cache, region), { recursive: true });
  for (const s of JSON.parse(readFileSync(f, 'utf8'))) {
    if (!s.fullTextFile) continue;
    const target = join(cache, region, s.fullTextFile.replace(/^sources\//, ''));
    if (existsSync(target)) continue;
    if (s.pmcid && s.fullTextFile.endsWith('.xml')) {
      const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/${s.pmcid}/fullTextXML`;
      const res = await fetch(url);
      if (res.ok) {
        writeFileSync(target, await res.text());
        console.log(`fetched ${s.key}`);
        continue;
      }
    }
    manual.push(`${region}/${s.key}: ${s.doi ? 'https://doi.org/' + s.doi : s.url} → ${target}`);
  }
}
if (manual.length) {
  console.log('\nRetrieve manually (save verbatim text to the path shown):');
  for (const m of manual) console.log('  ' + m);
}
