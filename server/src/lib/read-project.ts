import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { isAnalyzablePath, type SourceFile } from '@uidrift/shared';

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'out',
  '.next',
  '.nuxt',
  'coverage',
  'vendor',
  '.turbo',
  '.cache',
]);

/** Read a local project folder into SourceFile[] (used by the CLI and the seed script). */
export function readProject(root: string): { files: SourceFile[]; received: number } {
  const files: SourceFile[] = [];
  let received = 0;
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      const st = statSync(full);
      if (st.isDirectory()) {
        if (!SKIP_DIRS.has(name)) walk(full);
        continue;
      }
      received++;
      const path = relative(root, full).split('\\').join('/');
      if (isAnalyzablePath(path) && st.size <= 400_000)
        files.push({ path, content: readFileSync(full, 'utf8') });
    }
  };
  walk(root);
  return { files, received };
}
