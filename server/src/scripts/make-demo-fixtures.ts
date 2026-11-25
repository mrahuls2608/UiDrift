/**
 * Writes the report fixtures used by scripts/demo/stub-api.mjs (screenshots + demo video), from the
 * same real inputs as the seed script: the recorded website crawl and samples/acme-ui.
 *   npm run demo:fixtures -w server
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AnalysisResult } from '../services/analysis/index.js';
import { analyzeData } from '../services/analysis/index.js';
import { analyzeSource } from '../services/source/index.js';
import { buildReportBody } from '../services/pipeline.js';
import { readProject } from '../lib/read-project.js';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const out = join(repo, 'scripts/demo/fixtures');
mkdirSync(out, { recursive: true });

const site = JSON.parse(
  readFileSync(join(repo, 'server/seed/acme-website.json'), 'utf8'),
) as AnalysisResult & { pagesScanned: string[] };
const { pagesScanned, ...siteAnalysis } = site;
const website = await buildReportBody(siteAnalysis, { kind: 'url', target: 'acme.example' });
writeFileSync(
  join(out, 'website.json'),
  JSON.stringify(
    { ...website, url: 'https://acme.example/', domain: 'acme.example', pagesScanned },
    null,
    1,
  ),
);

const project = readProject(join(repo, 'samples/acme-ui'));
for (const [name, exclude] of [
  ['source', null],
  ['source-after', /(^public\/|PromoBanner|Checkout)/],
] as const) {
  const files = exclude ? project.files.filter((f) => !exclude.test(f.path)) : project.files;
  const src = analyzeSource(files, project.received);
  const body = await buildReportBody(analyzeData(src), {
    kind: 'source',
    target: 'acme-ui',
    source: src.meta,
  });
  const files_ = [...new Set(src.elements.map((e) => e.page.replace(/:\d+$/, '')))];
  writeFileSync(
    join(out, `${name}.json`),
    JSON.stringify(
      { ...body, url: 'acme-ui.zip', domain: 'acme-ui', pagesScanned: files_ },
      null,
      1,
    ),
  );
  console.log(name, body.score.overall);
}
console.log('website', website.score.overall);
