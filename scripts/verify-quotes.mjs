#!/usr/bin/env node
// Checks that every quote in the extraction files is an exact (whitespace-normalised) substring of the
// saved full text of its source. Full texts are not redistributed in this repository; fetch them with
// scripts/fetch-sources.mjs (open-access only) into a cache directory first.
//
// Usage: node scripts/verify-quotes.mjs <extraction-dir> <fulltext-cache-dir>
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const [extractionDir = 'evidence/extraction', cacheDir = '.fulltext-cache'] = process.argv.slice(2);

const stripTags = (s) => s.replace(/<\/?(sub|sup|i|b|italic|bold)>/g, '').replace(/<[^>]+>/g, ' ');
const norm = (s) =>
  s
    .replace(/<\/?(sub|sup|i|b|italic|bold)>/g, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&nbsp;|&#160;/g, ' ')
    .replace(/[   ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

let checked = 0;
const failures = [];
for (const region of readdirSync(extractionDir)) {
  const dir = join(extractionDir, region);
  if (!existsSync(join(dir, 'sources.json'))) continue;
  const sources = JSON.parse(readFileSync(join(dir, 'sources.json'), 'utf8'));
  const texts = new Map();
  for (const s of sources) {
    if (!s.fullTextFile) continue;
    const base = s.fullTextFile.replace(/^sources\//, '').replace(/\.(xml|html)$/, '.txt');
    const candidates = [join(cacheDir, region, base), join(cacheDir, region, s.fullTextFile.replace(/^sources\//, ''))];
    const f = candidates.find((p) => existsSync(p));
    if (f) {
      const raw = readFileSync(f, 'utf8');
      texts.set(s.key, norm(/\.(xml|html)$/.test(f) ? stripTags(raw) : raw));
    }
  }
  const files = ['constraints.json', 'recovery_models.json'].filter((f) => existsSync(join(dir, f)));
  for (const f of files) {
    for (const r of JSON.parse(readFileSync(join(dir, f), 'utf8'))) {
      if (!r.quote) continue;
      checked++;
      const t = texts.get(r.sourceKey);
      if (!t) failures.push(`${region}/${r.id}: full text for ${r.sourceKey} not in cache`);
      else if (!t.includes(norm(r.quote))) failures.push(`${region}/${r.id}: quote not found in ${r.sourceKey}`);
    }
  }
}
console.log(`Checked ${checked} quotes; ${failures.length} problem(s).`);
for (const f of failures) console.log('  ' + f);
process.exit(failures.length ? 1 : 0);
