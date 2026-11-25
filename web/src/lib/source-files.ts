import { SOURCE_LIMITS, isAnalyzablePath, type SourceFile } from '@uidrift/shared';

/**
 * Reads a ZIP or a folder in the browser and keeps only files the analyzer understands, so only
 * style and markup text is uploaded — never images, binaries, node_modules or build output.
 */
export interface PreparedSource {
  label: string;
  files: SourceFile[];
  skipped: number;
  bytes: number;
}

export class SourceReadError extends Error {}

function push(out: PreparedSource, path: string, content: string) {
  if (content.length > SOURCE_LIMITS.MAX_FILE_BYTES || content.includes('\u0000')) {
    out.skipped++;
    return;
  }
  if (out.files.length >= SOURCE_LIMITS.MAX_FILES)
    throw new SourceReadError(`More than ${SOURCE_LIMITS.MAX_FILES} source files.`);
  out.bytes += content.length;
  if (out.bytes > SOURCE_LIMITS.MAX_TOTAL_BYTES)
    throw new SourceReadError(
      'More than 6 MB of style and markup files. Upload a smaller part of the project.',
    );
  out.files.push({ path, content });
}

function finish(out: PreparedSource): PreparedSource {
  if (!out.files.length)
    throw new SourceReadError('No CSS, SCSS, LESS, HTML, JSX/TSX, Vue or Svelte files were found.');
  return out;
}

export async function readZip(file: File): Promise<PreparedSource> {
  if (file.size > SOURCE_LIMITS.MAX_ZIP_BYTES)
    throw new SourceReadError('The ZIP is larger than 40 MB.');
  const { default: JSZip } = await import('jszip');
  let zip: InstanceType<typeof JSZip>;
  try {
    zip = await JSZip.loadAsync(file);
  } catch {
    throw new SourceReadError('That file is not a valid ZIP archive.');
  }
  const entries = Object.values(zip.files).filter((e) => !e.dir);
  const top = entries[0]?.name.split('/')[0];
  const strip = top && entries.every((e) => e.name.startsWith(`${top}/`)) ? top.length + 1 : 0;
  const out: PreparedSource = { label: file.name, files: [], skipped: 0, bytes: 0 };
  for (const entry of entries) {
    const path = entry.name.slice(strip);
    if (!isAnalyzablePath(path)) {
      out.skipped++;
      continue;
    }
    push(out, path, await entry.async('string'));
  }
  return finish(out);
}

export async function readFolder(list: FileList): Promise<PreparedSource> {
  const files = [...list];
  const root = files[0]?.webkitRelativePath.split('/')[0] ?? 'folder';
  const out: PreparedSource = { label: `${root}/`, files: [], skipped: 0, bytes: 0 };
  for (const f of files) {
    const path = f.webkitRelativePath.split('/').slice(1).join('/') || f.name;
    if (!isAnalyzablePath(path) || f.size > SOURCE_LIMITS.MAX_FILE_BYTES) {
      out.skipped++;
      continue;
    }
    push(out, path, await f.text());
  }
  return finish(out);
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
