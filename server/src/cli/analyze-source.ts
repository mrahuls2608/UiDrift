#!/usr/bin/env node
/**
 * UIDrift source-code audit from the command line. Works fully offline with no LLM.
 *
 *   npm run analyze -- ./path/to/project
 *   npm run analyze -- ./app --out ./uidrift-report
 *   npm run analyze -- ./app --llm anthropic                 # prompts for the key (hidden)
 *   npm run analyze -- ./app --llm openai --model gpt-4o-mini --api-key sk-...
 *   npm run analyze -- ./app --llm openai-compatible --base-url https://api.groq.com/openai/v1 --model llama-3.3-70b
 *
 * The LLM key is only ever taken from these flags or the prompt — never from environment variables.
 */
process.env.LOG_LEVEL ??= 'silent';

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { Writable } from 'node:stream';
import { LLM_PROVIDERS, llmConfigSchema, scoreLabel, type LlmConfigInput } from '@uidrift/shared';

const { readProject } = await import('../lib/read-project.js');
const { analyzeSource } = await import('../services/source/index.js');
const { analyzeData } = await import('../services/analysis/index.js');
const { buildReportBody } = await import('../services/pipeline.js');
const { filterSourceFiles } = await import('../services/source/ingest.js');

const HELP = `Usage: npm run analyze -- <project-folder> [options]

Options:
  --out <dir>          Output folder (default: ./uidrift-report)
  --llm <provider>     Optional: ${LLM_PROVIDERS.join(' | ')}
  --model <name>       LLM model (default for anthropic: claude-opus-5-5)
  --base-url <url>     Base URL for openai-compatible providers
  --api-key <key>      LLM API key (omit to be prompted; never read from env)
  --json               Print the full report JSON to stdout
  -h, --help           Show this help`;

function parseArgs(argv: string[]) {
  const opts: Record<string, string | boolean> = {};
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i] as string;
    if (a === '-h' || a === '--help') opts.help = true;
    else if (a === '--json') opts.json = true;
    else if (a.startsWith('--')) opts[a.slice(2)] = argv[++i] ?? '';
    else positional.push(a);
  }
  return { opts, positional };
}

async function promptHidden(question: string): Promise<string> {
  let muted = false;
  const output = new Writable({
    write(chunk, _enc, cb) {
      if (!muted) process.stderr.write(chunk);
      cb();
    },
  });
  const rl = createInterface({ input: process.stdin, output, terminal: true });
  return new Promise((done) => {
    rl.question(question, (answer) => {
      rl.close();
      process.stderr.write('\n');
      done(answer.trim());
    });
    muted = true;
  });
}

function write(file: string, content: string) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}

async function main() {
  const { opts, positional } = parseArgs(process.argv.slice(2));
  if (opts.help || !positional[0]) {
    console.log(HELP);
    process.exit(positional[0] ? 0 : 1);
  }
  const root = resolve(positional[0] as string);
  const out = resolve(typeof opts.out === 'string' ? opts.out : 'uidrift-report');

  let llm: LlmConfigInput | null = null;
  if (typeof opts.llm === 'string') {
    const apiKey =
      typeof opts['api-key'] === 'string'
        ? opts['api-key']
        : await promptHidden(`${opts.llm} API key (input hidden): `);
    const parsed = llmConfigSchema.safeParse({
      provider: opts.llm,
      apiKey,
      ...(typeof opts.model === 'string' ? { model: opts.model } : {}),
      ...(typeof opts['base-url'] === 'string' ? { baseUrl: opts['base-url'] } : {}),
    });
    if (!parsed.success) {
      console.error(`Invalid LLM options: ${parsed.error.issues[0]?.message}`);
      process.exit(1);
    }
    llm = parsed.data;
  }

  const project = readProject(root);
  const { files } = filterSourceFiles(project.files);
  const src = analyzeSource(files, project.received);
  const analysis = analyzeData(src);
  const target = root.split(/[\\/]/).pop() || 'project';
  const body = await buildReportBody(analysis, { kind: 'source', target, llm, source: src.meta });

  write(join(out, 'report.json'), JSON.stringify(body, null, 2));
  write(join(out, 'tokens.json'), JSON.stringify(body.tokens.json, null, 2));
  for (const f of body.components) write(join(out, f.path), f.content);
  const md = [
    `# UIDrift insights — ${target}`,
    '',
    `Engine: ${body.insights.engine === 'llm' ? `${body.insights.provider} (${body.insights.model ?? 'default'})` : 'rule-based (no AI)'}`,
    body.insights.fallbackReason ? `> LLM not used: ${body.insights.fallbackReason}` : '',
    '',
    body.insights.summary,
    '',
    ...body.insights.recommendations.map(
      (r, i) => `${i + 1}. **${r.title}** _(${r.impact} impact, ${r.category})_\n   ${r.detail}`,
    ),
    '',
  ].join('\n');
  write(join(out, 'insights.md'), md);

  if (opts.json) {
    console.log(JSON.stringify(body, null, 2));
    return;
  }
  const s = body.score;
  console.log(
    `\nUIDrift · ${target} · ${src.meta.filesAnalyzed} files (${src.meta.frameworks.join(', ') || 'plain CSS/HTML'})`,
  );
  console.log(`Score ${s.overall}/100 — ${scoreLabel(s.overall)}`);
  console.log(
    `  components ${s.components} · colors ${s.colors} · typography ${s.typography} · spacing ${s.spacing} · radius ${s.radius} · a11y −${s.a11yPenalty}`,
  );
  for (const c of body.summary.components.filter((x) => x.variants > 0))
    console.log(`  ${c.type.padEnd(8)} ${c.variants} variants (ideal ${c.ideal})`);
  console.log(
    `  colors   ${body.summary.colors.actual} (ideal ${body.summary.colors.ideal}) · accessibility issues ${body.summary.a11yIssues}`,
  );
  console.log(`\n${body.insights.summary}`);
  if (body.insights.fallbackReason) console.log(`(LLM not used: ${body.insights.fallbackReason})`);
  console.log(`\nWrote ${out}/ — report.json, insights.md, tokens.css, tokens.json, components/`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
