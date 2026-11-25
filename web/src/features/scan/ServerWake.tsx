'use client';

import { useServerStatus } from '@/hooks/queries';

/** Free-tier servers sleep; pinging /health on load starts the wake-up before the user scans. */
export function ServerWake() {
  const { isPending, isError, failureCount } = useServerStatus();
  if (!isPending && !isError) return null;
  if (isPending && failureCount === 0) return null;
  return (
    <p
      role="status"
      className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-sm text-muted"
    >
      <span aria-hidden className="h-2 w-2 animate-pulse rounded-full bg-warning" />
      {isError
        ? 'The server is unavailable right now. Demo reports may still load.'
        : 'Waking up server… this can take ~30 s.'}
    </p>
  );
}
