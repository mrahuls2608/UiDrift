'use client';

import { useId, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { createScanSchema } from '@uidrift/shared';
import { Button } from '@/components/ui/Button';
import { useCreateScan } from '@/hooks/queries';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/cn';

/** Terminal-style URL prompt: `$ uidrift scan <url>` with inline validation. */
export function ScanForm({ initialUrl = '' }: { initialUrl?: string }) {
  const [url, setUrl] = useState(initialUrl);
  const [error, setError] = useState<string>();
  const create = useCreateScan();
  const router = useRouter();
  const id = useId();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = createScanSchema.safeParse({ url });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Enter a valid URL');
      return;
    }
    setError(undefined);
    create.mutate(parsed.data, {
      onSuccess: ({ scanId }) => router.push(`/scan/${scanId}`),
      onError: (err) =>
        setError(err instanceof ApiError ? err.message : 'Could not start the scan.'),
    });
  };

  return (
    <form onSubmit={submit} noValidate className="flex w-full max-w-prose flex-col gap-2">
      <label htmlFor={id} className="sr-only">
        Website URL
      </label>
      <div
        className={cn(
          'flex flex-col gap-2 rounded-lg border bg-bg p-2 transition duration-200 focus-within:glow sm:flex-row sm:items-center',
          error ? 'border-danger' : 'border-border focus-within:border-primary',
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2 pl-2">
          <span aria-hidden className="shrink-0 font-mono text-sm text-primary">
            $ uidrift scan
          </span>
          <input
            id={id}
            type="url"
            inputMode="url"
            autoComplete="url"
            spellCheck={false}
            placeholder="your-website.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            className="h-11 min-w-0 flex-1 bg-transparent font-mono text-base text-text outline-none placeholder:text-muted"
          />
        </div>
        <Button type="submit" size="lg" loading={create.isPending}>
          {create.isPending ? 'Starting…' : 'Scan'}
          {!create.isPending && <ArrowRight aria-hidden size={16} />}
        </Button>
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </form>
  );
}
