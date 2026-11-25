'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createScanSchema } from '@uidrift/shared';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useCreateScan } from '@/hooks/queries';
import { ApiError } from '@/lib/api';

export function ScanForm({ initialUrl = '' }: { initialUrl?: string }) {
  const [url, setUrl] = useState(initialUrl);
  const [error, setError] = useState<string>();
  const create = useCreateScan();
  const router = useRouter();

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
    <form
      onSubmit={submit}
      noValidate
      className="flex w-full max-w-prose flex-col gap-2 sm:flex-row sm:items-start"
    >
      <Input
        label="Website URL"
        hideLabel
        type="url"
        inputMode="url"
        autoComplete="url"
        placeholder="https://your-website.com"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        error={error}
      />
      <Button type="submit" size="lg" loading={create.isPending}>
        {create.isPending ? 'Starting…' : 'Scan'}
      </Button>
    </form>
  );
}
