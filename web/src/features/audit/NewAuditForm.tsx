'use client';

import { useRef, useState, type DragEvent, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bot,
  ClipboardPaste,
  FileArchive,
  FolderOpen,
  Github,
  Globe,
  Plus,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  DEFAULT_ANTHROPIC_MODEL,
  createScanSchema,
  createSourceScanSchema,
  llmConfigSchema,
  type LlmConfigInput,
  type LlmProvider,
  type SourceFile,
} from '@uidrift/shared';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Segmented } from '@/components/ui/Segmented';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useCreateScan, useCreateSourceScan } from '@/hooks/queries';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/cn';
import {
  formatBytes,
  readFolder,
  readZip,
  SourceReadError,
  type PreparedSource,
} from '@/lib/source-files';

type Kind = 'url' | 'source';
type SourceMode = 'upload' | 'github' | 'paste';
type Engine = 'rules' | 'llm';

const PROVIDERS: Array<{ value: LlmProvider; label: string }> = [
  { value: 'anthropic', label: 'Anthropic (Claude)' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'openai-compatible', label: 'OpenAI-compatible (Groq, Together, OpenRouter, local…)' },
];

const PASTE_PLACEHOLDER = `.btn-primary {
  background: #2563eb;
  color: #fff;
  padding: 10px 20px;
  border-radius: 6px;
}`;

/** `{ path: message }` from the first zod issue, so errors show next to the right field. */
function firstIssue(
  issues: Array<{ path: (string | number)[]; message: string }>,
): Record<string, string> {
  const issue = issues[0];
  return issue ? { [issue.path.join('.')]: issue.message } : {};
}

export function NewAuditForm() {
  const router = useRouter();
  const createUrl = useCreateScan();
  const createSource = useCreateSourceScan();
  const [kind, setKind] = useState<Kind>('url');
  const [url, setUrl] = useState('');
  const [maxPages, setMaxPages] = useState('10');
  const [mode, setMode] = useState<SourceMode>('upload');
  const [prepared, setPrepared] = useState<PreparedSource | null>(null);
  const [reading, setReading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [repo, setRepo] = useState('');
  const [pasted, setPasted] = useState<SourceFile[]>([{ path: 'styles.css', content: '' }]);
  const [engine, setEngine] = useState<Engine>('rules');
  const [llm, setLlm] = useState<LlmConfigInput>({
    provider: 'anthropic',
    apiKey: '',
    model: '',
    baseUrl: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const zipInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const pending = createUrl.isPending || createSource.isPending;

  const load = async (task: () => Promise<PreparedSource>) => {
    setReading(true);
    setErrors({});
    try {
      setPrepared(await task());
    } catch (err) {
      setPrepared(null);
      setErrors({
        upload: err instanceof SourceReadError ? err.message : 'Could not read those files.',
      });
    } finally {
      setReading(false);
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void load(() => readZip(file));
  };

  const llmConfig = (): LlmConfigInput | undefined | null => {
    if (engine === 'rules') return undefined;
    const cleaned = {
      provider: llm.provider,
      apiKey: llm.apiKey,
      ...(llm.model?.trim() ? { model: llm.model.trim() } : {}),
      ...(llm.provider === 'openai-compatible' && llm.baseUrl?.trim()
        ? { baseUrl: llm.baseUrl.trim() }
        : {}),
    };
    const parsed = llmConfigSchema.safeParse(cleaned);
    if (!parsed.success) {
      const issue = firstIssue(parsed.error.issues);
      setErrors(Object.fromEntries(Object.entries(issue).map(([k, v]) => [`llm.${k}`, v])));
      return null;
    }
    return parsed.data;
  };

  const onError = (err: Error) =>
    setErrors({ form: err instanceof ApiError ? err.message : 'Could not start the audit.' });
  const onSuccess = ({ scanId }: { scanId: string }) => router.push(`/scan/${scanId}`);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setErrors({});
    const llmInput = llmConfig();
    if (llmInput === null) return;

    if (kind === 'url') {
      const parsed = createScanSchema.safeParse({
        url,
        maxPages,
        ...(llmInput ? { llm: llmInput } : {}),
      });
      if (!parsed.success) return setErrors(firstIssue(parsed.error.issues));
      return createUrl.mutate(parsed.data, { onSuccess, onError });
    }

    let source: unknown;
    if (mode === 'github') source = { type: 'github', repo };
    else if (mode === 'upload') {
      if (!prepared) return setErrors({ upload: 'Choose a ZIP file or a folder first.' });
      source = { type: 'files', label: prepared.label, files: prepared.files };
    } else {
      const files = pasted.filter((f) => f.content.trim());
      if (!files.length)
        return setErrors({ 'paste.0': 'Paste some CSS, HTML, JSX, Vue or Svelte code.' });
      source = { type: 'files', label: 'Pasted code', files };
    }
    const parsed = createSourceScanSchema.safeParse({
      source,
      ...(llmInput ? { llm: llmInput } : {}),
    });
    if (!parsed.success) {
      const issue = firstIssue(parsed.error.issues);
      return setErrors(
        issue['source.repo']
          ? { repo: issue['source.repo'] }
          : { form: Object.values(issue)[0] ?? 'Check the form.' },
      );
    }
    createSource.mutate(parsed.data, { onSuccess, onError });
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      <Card className="flex flex-col gap-6">
        <Segmented<Kind>
          legend="What do you want to audit?"
          variant="cards"
          value={kind}
          onChange={setKind}
          options={[
            {
              value: 'url',
              label: 'A live website',
              description: 'Headless Chrome crawls up to 10 pages and reads real computed styles.',
              icon: Globe,
            },
            {
              value: 'source',
              label: 'Source code',
              description:
                'Static analysis of CSS, SCSS, Tailwind, JSX, Vue and Svelte. No browser needed.',
              icon: FileArchive,
            },
          ]}
        />

        {kind === 'url' ? (
          <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
            <Input
              label="Website URL"
              type="url"
              inputMode="url"
              autoComplete="url"
              placeholder="https://your-website.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              error={errors.url}
              helperText="Public pages only. robots.txt is respected."
            />
            <Select
              label="Pages to scan"
              value={maxPages}
              onChange={(e) => setMaxPages(e.target.value)}
              options={['1', '3', '5', '10'].map((n) => ({
                value: n,
                label: `Up to ${n} page${n === '1' ? '' : 's'}`,
              }))}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <Segmented<SourceMode>
              legend="Where is the code?"
              value={mode}
              onChange={(m) => {
                setMode(m);
                setErrors({});
              }}
              options={[
                { value: 'upload', label: 'Upload', icon: Upload },
                { value: 'github', label: 'GitHub repo', icon: Github },
                { value: 'paste', label: 'Paste code', icon: ClipboardPaste },
              ]}
            />

            {mode === 'upload' && (
              <div className="flex flex-col gap-2">
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={onDrop}
                  className={cn(
                    'flex flex-col items-center gap-4 rounded-md border-2 border-dashed p-8 text-center transition duration-200',
                    dragging ? 'border-primary bg-primary/5' : 'border-border bg-surface/60',
                  )}
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand text-white shadow-md">
                    <Upload aria-hidden size={20} />
                  </span>
                  <p className="text-sm text-muted">
                    Drop a <strong className="text-text">.zip</strong> of your project here, or
                    choose one. Only style and markup files are read — in your browser — and
                    uploaded.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => zipInput.current?.click()}
                      loading={reading}
                    >
                      <FileArchive aria-hidden size={16} /> Choose ZIP
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => folderInput.current?.click()}
                      disabled={reading}
                    >
                      <FolderOpen aria-hidden size={16} /> Choose folder
                    </Button>
                  </div>
                  <input
                    ref={zipInput}
                    type="file"
                    accept=".zip,application/zip"
                    className="sr-only"
                    tabIndex={-1}
                    aria-label="ZIP file"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void load(() => readZip(file));
                      e.target.value = '';
                    }}
                  />
                  <input
                    ref={folderInput}
                    type="file"
                    className="sr-only"
                    tabIndex={-1}
                    aria-label="Project folder"
                    multiple
                    {...{ webkitdirectory: '', directory: '' }}
                    onChange={(e) => {
                      const list = e.target.files;
                      if (list?.length) void load(() => readFolder(list));
                      e.target.value = '';
                    }}
                  />
                </div>
                {prepared && (
                  <p role="status" className="rounded-md bg-mint px-4 py-3 text-sm text-mint-ink">
                    <strong>{prepared.label}</strong>: {prepared.files.length} files ready (
                    {formatBytes(prepared.bytes)}) · {prepared.skipped} skipped (images,
                    dependencies, build output…)
                  </p>
                )}
                {errors.upload && (
                  <p role="alert" className="text-sm text-danger">
                    {errors.upload}
                  </p>
                )}
              </div>
            )}

            {mode === 'github' && (
              <Input
                label="Public GitHub repository"
                placeholder="https://github.com/owner/repo"
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                error={errors.repo}
                helperText="Add /tree/branch to audit a specific branch. Private repositories aren't supported — upload a ZIP instead."
              />
            )}

            {mode === 'paste' && (
              <div className="flex flex-col gap-4">
                {pasted.map((f, i) => (
                  <div
                    key={i}
                    className="flex flex-col gap-2 rounded-md bg-surface/60 p-4 shadow-sm"
                  >
                    <div className="flex items-end gap-2">
                      <Input
                        label={`File ${i + 1} name`}
                        value={f.path}
                        onChange={(e) =>
                          setPasted((all) =>
                            all.map((x, j) => (j === i ? { ...x, path: e.target.value } : x)),
                          )
                        }
                        helperText="The extension decides how it's parsed (.css, .scss, .tsx, .vue, .html…)."
                      />
                      {pasted.length > 1 && (
                        <Button
                          variant="ghost"
                          aria-label={`Remove file ${i + 1}`}
                          onClick={() => setPasted((all) => all.filter((_, j) => j !== i))}
                        >
                          <Trash2 aria-hidden size={16} />
                        </Button>
                      )}
                    </div>
                    <Textarea
                      label={`File ${i + 1} contents`}
                      placeholder={PASTE_PLACEHOLDER}
                      spellCheck={false}
                      value={f.content}
                      error={errors[`paste.${i}`]}
                      onChange={(e) =>
                        setPasted((all) =>
                          all.map((x, j) => (j === i ? { ...x, content: e.target.value } : x)),
                        )
                      }
                    />
                  </div>
                ))}
                <Button
                  variant="secondary"
                  className="self-start"
                  onClick={() =>
                    setPasted((all) => [
                      ...all,
                      { path: `file-${all.length + 1}.css`, content: '' },
                    ])
                  }
                >
                  <Plus aria-hidden size={16} /> Add another file
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>

      <Card className="flex flex-col gap-6">
        <Segmented<Engine>
          legend="Insights"
          variant="cards"
          value={engine}
          onChange={setEngine}
          options={[
            {
              value: 'rules',
              label: 'Rule-based (no AI)',
              description:
                'Deterministic recommendations computed from the audit. Free and private.',
              icon: ShieldCheck,
            },
            {
              value: 'llm',
              label: 'Use my own LLM',
              description:
                'Your model rewrites the same findings. Scores and tokens stay identical.',
              icon: Bot,
            },
          ]}
        />
        {engine === 'llm' && (
          <div className="flex flex-col gap-4 rounded-md bg-surface/60 p-4 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Provider"
                value={llm.provider}
                onChange={(e) => setLlm((c) => ({ ...c, provider: e.target.value as LlmProvider }))}
                options={PROVIDERS}
              />
              <Input
                label={llm.provider === 'anthropic' ? 'Model (optional)' : 'Model'}
                placeholder={
                  llm.provider === 'anthropic'
                    ? DEFAULT_ANTHROPIC_MODEL
                    : llm.provider === 'openai'
                      ? 'e.g. gpt-4o-mini'
                      : 'e.g. llama-3.3-70b'
                }
                value={llm.model ?? ''}
                onChange={(e) => setLlm((c) => ({ ...c, model: e.target.value }))}
                error={errors['llm.model']}
                autoComplete="off"
              />
            </div>
            {llm.provider === 'openai-compatible' && (
              <Input
                label="Base URL"
                type="url"
                placeholder="https://api.groq.com/openai/v1"
                value={llm.baseUrl ?? ''}
                onChange={(e) => setLlm((c) => ({ ...c, baseUrl: e.target.value }))}
                error={errors['llm.baseUrl']}
                helperText="The server calls {base URL}/chat/completions. Must be a public https URL."
              />
            )}
            <Input
              label="API key"
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={llm.apiKey}
              onChange={(e) => setLlm((c) => ({ ...c, apiKey: e.target.value }))}
              error={errors['llm.apiKey']}
              helperText="Used once for this audit, encrypted for at most 15 minutes, then deleted. Never stored, logged or shown again."
            />
          </div>
        )}
      </Card>

      {errors.form && (
        <p role="alert" className="rounded-md bg-danger/10 px-4 py-3 text-sm text-danger">
          {errors.form}
        </p>
      )}
      <Button type="submit" size="lg" loading={pending} className="self-start">
        {pending ? 'Starting…' : 'Start audit'}
      </Button>
    </form>
  );
}
