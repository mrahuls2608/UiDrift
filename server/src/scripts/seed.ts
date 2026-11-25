/**
 * Seeds demo users, their audit history and two public demo reports — using only real analysis
 * output (no LLM, no network): a recorded website crawl and the bundled `samples/acme-ui` project.
 *
 *   npm run seed                          # local / docker (refuses NODE_ENV=production without --force)
 *   npm run seed -- --force               # production demo database
 *   npm run seed -- --password 'S3cret!'  # use one password for every demo user
 *
 * Safe to re-run: it replaces the demo users, their audits and the demo reports, nothing else.
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import type { ScanKind, SourceMeta } from '@uidrift/shared';
import { isProd } from '../config/env.js';
import { connectDb, disconnectDb } from '../lib/db.js';
import { readProject } from '../lib/read-project.js';
import { User } from '../models/user.model.js';
import { Scan, type ScanDocument } from '../models/scan.model.js';
import { Report } from '../models/report.model.js';
import { analyzeData, type AnalysisResult } from '../services/analysis/index.js';
import { analyzeSource } from '../services/source/index.js';
import { buildReportBody } from '../services/pipeline.js';

const here = dirname(fileURLToPath(import.meta.url));
/** Works from src/ (tsx) and dist/ (node), locally and in the Docker image. */
function findUp(rel: string): string {
  for (let dir = here, i = 0; i < 6; i++, dir = dirname(dir)) {
    const p = join(dir, rel);
    if (existsSync(p)) return p;
  }
  throw new Error(`Could not find ${rel}`);
}

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const option = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

export const DEMO_USERS = [
  {
    email: 'demo@uidrift.dev',
    password: 'Demo@12345',
    name: 'Demo User',
    role: 'Full history: website + code audits, score trend',
  },
  {
    email: 'designer@uidrift.dev',
    password: 'Designer@12345',
    name: 'Dana Designer',
    role: 'One source-code audit',
  },
  {
    email: 'manager@uidrift.dev',
    password: 'Manager@12345',
    name: 'Morgan Manager',
    role: 'One website audit',
  },
] as const;

interface Audit {
  kind: ScanKind;
  url: string;
  domain: string;
  analysis: AnalysisResult;
  pagesScanned: string[];
  source?: SourceMeta;
  sourceType?: 'files' | 'github';
}

function websiteAudit(): Audit {
  const raw = JSON.parse(
    readFileSync(findUp('seed/acme-website.json'), 'utf8'),
  ) as AnalysisResult & { pagesScanned: string[] };
  const { pagesScanned, ...analysis } = raw;
  return {
    kind: 'url',
    url: 'https://acme.example/',
    domain: 'acme.example',
    analysis,
    pagesScanned,
  };
}

/** `exclude` produces the "after a cleanup" snapshot used for the score-history trend. */
function sourceAudit(exclude: RegExp | null, label: string): Audit {
  const root = resolve(findUp('samples/acme-ui'));
  const { files, received } = readProject(root);
  const kept = exclude ? files.filter((f) => !exclude.test(f.path)) : files;
  const src = analyzeSource(kept, received);
  return {
    kind: 'source',
    sourceType: 'files',
    url: label,
    domain: 'acme-ui',
    analysis: analyzeData(src),
    pagesScanned: [...new Set(src.elements.map((e) => e.page.replace(/:\d+$/, '')))],
    source: src.meta,
  };
}

async function save(audit: Audit, opts: { userId?: string; isDemo?: boolean; daysAgo: number }) {
  const at = new Date(Date.now() - opts.daysAgo * 86_400_000);
  const scan = (await Scan.create({
    userId: opts.userId,
    kind: audit.kind,
    sourceType: audit.sourceType,
    url: audit.url,
    domain: audit.domain,
    maxPages: audit.kind === 'url' ? 10 : 1,
    status: 'done',
    progress: {
      pagesDone: audit.pagesScanned.length,
      pagesTotal: audit.pagesScanned.length,
      step: 'Done',
    },
    pagesScanned: audit.pagesScanned,
    isDemo: opts.isDemo ?? false,
    score: audit.analysis.score.overall,
    insightsEngine: 'rules',
    completedAt: at,
  })) as ScanDocument;
  // Backdate through the driver: Mongoose treats createdAt as immutable once timestamps are on.
  await Scan.collection.updateOne({ _id: scan._id }, { $set: { createdAt: at } });
  const body = await buildReportBody(audit.analysis, {
    kind: audit.kind,
    target: audit.domain,
    source: audit.source,
  });
  await Report.create({ scanId: scan._id, body });
  return audit.analysis.score.overall;
}

async function main() {
  if (isProd && !flag('force')) {
    console.error(
      'Refusing to seed with NODE_ENV=production. Re-run with --force to seed a production demo database.',
    );
    process.exit(1);
  }
  const password = option('password');
  if (password !== undefined && password.length < 8)
    throw new Error('--password must be at least 8 characters');

  await connectDb();
  const emails = DEMO_USERS.map((u) => u.email);
  const old = await User.find({ email: { $in: emails } }).select('_id');
  const oldScans = await Scan.find({
    $or: [{ userId: { $in: old.map((u) => u._id) } }, { isDemo: true }],
  }).select('_id');
  await Report.deleteMany({ scanId: { $in: oldScans.map((s) => s._id) } });
  await Scan.deleteMany({ _id: { $in: oldScans.map((s) => s._id) } });
  await User.deleteMany({ email: { $in: emails } });

  const users: Record<string, string> = {};
  for (const u of DEMO_USERS) {
    const doc = await User.create({
      email: u.email,
      name: u.name,
      isDemo: true,
      passwordHash: await bcrypt.hash(password ?? u.password, 10),
    });
    users[u.email] = doc._id.toString();
  }

  const website = websiteAudit();
  const before = sourceAudit(null, 'acme-ui.zip');
  const after = sourceAudit(/(^public\/|PromoBanner|Checkout)/, 'acme-ui.zip (after cleanup)');

  const scores = {
    demoWebsite: await save(website, { isDemo: true, daysAgo: 1 }),
    demoSource: await save(before, { isDemo: true, daysAgo: 1 }),
  };
  await save(before, { userId: users['demo@uidrift.dev'], daysAgo: 21 });
  await save(after, { userId: users['demo@uidrift.dev'], daysAgo: 3 });
  await save(website, { userId: users['demo@uidrift.dev'], daysAgo: 2 });
  await save(before, { userId: users['designer@uidrift.dev'], daysAgo: 5 });
  await save(website, { userId: users['manager@uidrift.dev'], daysAgo: 4 });

  console.log('\nSeeded UIDrift demo data');
  console.log(
    `  Demo reports: acme.example website (${scores.demoWebsite}/100), acme-ui source code (${scores.demoSource}/100)`,
  );
  console.log(
    `  acme-ui history for demo@uidrift.dev: ${before.analysis.score.overall} → ${after.analysis.score.overall}\n`,
  );
  console.log('  Email                   Password          What they see');
  for (const u of DEMO_USERS)
    console.log(`  ${u.email.padEnd(23)} ${(password ?? u.password).padEnd(17)} ${u.role}`);
  console.log('');
  await disconnectDb();
}

main().catch(async (err) => {
  console.error('Seeding failed:', err instanceof Error ? err.message : err);
  await disconnectDb().catch(() => undefined);
  process.exit(1);
});
