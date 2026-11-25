import JSZip from 'jszip';
import { SOURCE_LIMITS, isAnalyzablePath, type SourceFile } from '@uidrift/shared';
import { AppError } from '../../lib/errors.js';

export interface IngestResult {
  files: SourceFile[];
  received: number;
}

const tooBig = (msg: string) => new AppError(413, 'SOURCE_TOO_LARGE', msg);

/** Keep analyzable text files within the per-file and total limits (applied everywhere). */
export function filterSourceFiles(files: SourceFile[]): IngestResult {
  const out: SourceFile[] = [];
  let total = 0;
  for (const f of files) {
    const path = f.path.replace(/\\/g, '/').replace(/^\.?\//, '');
    if (path.includes('..') || !isAnalyzablePath(path)) continue;
    if (f.content.length > SOURCE_LIMITS.MAX_FILE_BYTES || f.content.includes('\u0000')) continue;
    total += f.content.length;
    if (total > SOURCE_LIMITS.MAX_TOTAL_BYTES)
      throw tooBig('The source is larger than 6 MB of style and markup files.');
    out.push({ path, content: f.content });
    if (out.length > SOURCE_LIMITS.MAX_FILES)
      throw tooBig(`More than ${SOURCE_LIMITS.MAX_FILES} analyzable files.`);
  }
  if (!out.length) {
    throw new AppError(
      422,
      'NO_SOURCE_FILES',
      'No CSS, SCSS, LESS, HTML, JSX/TSX, Vue or Svelte files were found.',
    );
  }
  return { files: out, received: files.length };
}

type ZipEntry = JSZip.JSZipObject & { _data?: { uncompressedSize?: number } };

/** Read a ZIP archive with zip-bomb guards (entry count, declared and actual sizes). */
export async function filesFromZip(data: ArrayBuffer | Uint8Array): Promise<SourceFile[]> {
  if (data.byteLength > SOURCE_LIMITS.MAX_ZIP_BYTES)
    throw tooBig('The archive is larger than 40 MB.');
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(data);
  } catch {
    throw new AppError(400, 'INVALID_ARCHIVE', 'The file is not a valid ZIP archive.');
  }
  const entries = Object.values(zip.files) as ZipEntry[];
  if (entries.length > 50_000) throw tooBig('The archive contains too many entries.');
  // GitHub archives wrap everything in "<repo>-<ref>/"; strip a single shared top folder.
  const names = entries.filter((e) => !e.dir).map((e) => e.name);
  const top = names[0]?.split('/')[0];
  const strip = top && names.every((n) => n.startsWith(`${top}/`)) ? top.length + 1 : 0;

  const files: SourceFile[] = [];
  let total = 0;
  for (const entry of entries) {
    if (entry.dir) continue;
    const path = entry.name.slice(strip);
    if (!isAnalyzablePath(path)) continue;
    const declared = entry._data?.uncompressedSize ?? 0;
    if (declared > SOURCE_LIMITS.MAX_FILE_BYTES) continue;
    const content = await entry.async('string');
    if (content.length > SOURCE_LIMITS.MAX_FILE_BYTES) continue;
    total += content.length;
    if (total > SOURCE_LIMITS.MAX_TOTAL_BYTES)
      throw tooBig('The source is larger than 6 MB of style and markup files.');
    files.push({ path, content });
  }
  return files;
}

export function parseGithubRepo(input: string): { owner: string; repo: string; ref?: string } {
  const url = new URL(input.startsWith('http') ? input : `https://${input}`);
  const [owner, repo, tree, ...rest] = url.pathname.split('/').filter(Boolean);
  if (url.hostname.replace(/^www\./, '') !== 'github.com' || !owner || !repo) {
    throw new AppError(400, 'INVALID_REPO', 'Enter a public GitHub repository URL.');
  }
  return {
    owner,
    repo: repo.replace(/\.git$/, ''),
    ref: tree === 'tree' && rest.length ? rest.join('/') : undefined,
  };
}

/** Download a public GitHub repository as a ZIP (fixed host: no user-controlled fetch targets). */
export async function fetchGithubRepo(
  input: string,
  fetchImpl: typeof fetch = fetch,
): Promise<IngestResult> {
  const { owner, repo, ref } = parseGithubRepo(input);
  const archive = `https://codeload.github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/zip/${ref ? ref.split('/').map(encodeURIComponent).join('/') : 'HEAD'}`;
  const res = await fetchImpl(archive, { redirect: 'follow', signal: AbortSignal.timeout(60_000) });
  if (res.status === 404)
    throw new AppError(404, 'REPO_NOT_FOUND', 'Repository not found, or it is private.');
  if (!res.ok || !res.body)
    throw new AppError(502, 'REPO_DOWNLOAD_FAILED', `GitHub responded with ${res.status}.`);
  const length = Number(res.headers.get('content-length') ?? 0);
  if (length > SOURCE_LIMITS.MAX_ZIP_BYTES)
    throw tooBig('The repository archive is larger than 40 MB.');

  const chunks: Uint8Array[] = [];
  let size = 0;
  const reader = res.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > SOURCE_LIMITS.MAX_ZIP_BYTES) {
      await reader.cancel();
      throw tooBig('The repository archive is larger than 40 MB.');
    }
    chunks.push(value);
  }
  const buffer = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    buffer.set(c, offset);
    offset += c.byteLength;
  }
  const files = await filesFromZip(buffer);
  return filterSourceFiles(files);
}
