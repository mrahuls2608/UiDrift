'use client';

import { useEffect, useRef, useState } from 'react';
import type { ScanDTO, ScanEvent } from '@uidrift/shared';
import { api, ApiError, SSE_BASE } from '@/lib/api';

const TERMINAL = new Set(['done', 'failed', 'cancelled']);
const POLL_MS = 3000;
const MAX_LOG = 5;

export interface ScanStream {
  scan: ScanDTO | null;
  log: ScanEvent[];
  mode: 'connecting' | 'live' | 'polling';
  error: ApiError | null;
}

function merge(scan: ScanDTO | null, event: ScanEvent): ScanDTO | null {
  if (!scan) return scan;
  const status = (
    {
      queued: 'queued',
      page_started: 'crawling',
      page_done: 'crawling',
      analysing: 'analysing',
      done: 'done',
      failed: 'failed',
      cancelled: 'cancelled',
    } as const
  )[event.type];
  return {
    ...scan,
    status,
    progress: event.progress,
    error: event.type === 'failed' ? event.message : scan.error,
  };
}

/** Live progress over Server-Sent Events, falling back to polling every 3 s (TRD §8). */
export function useScanEvents(scanId: string): ScanStream {
  const [state, setState] = useState<ScanStream>({
    scan: null,
    log: [],
    mode: 'connecting',
    error: null,
  });
  const seen = useRef(new Set<string>());

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let source: EventSource | undefined;

    const pushEvent = (event: ScanEvent) => {
      const key = `${event.at}|${event.type}|${event.message}`;
      if (seen.current.has(key)) return;
      seen.current.add(key);
      setState((s) => ({
        ...s,
        scan: merge(s.scan, event),
        log: [event, ...s.log].slice(0, MAX_LOG),
      }));
      if (TERMINAL.has(event.type)) source?.close();
    };

    const poll = async () => {
      try {
        const scan = await api.getScan(scanId);
        if (cancelled) return;
        setState((s) => ({ ...s, scan, mode: 'polling', error: null }));
        if (!TERMINAL.has(scan.status)) timer = setTimeout(poll, POLL_MS);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
          setState((s) => ({ ...s, error: err }));
          return;
        }
        timer = setTimeout(poll, POLL_MS);
      }
    };

    if (typeof EventSource === 'undefined') {
      void poll();
    } else {
      source = new EventSource(`${SSE_BASE}/scans/${scanId}/events`, { withCredentials: true });
      source.addEventListener('snapshot', (e) => {
        const scan = JSON.parse((e as MessageEvent<string>).data) as ScanDTO;
        setState((s) => ({ ...s, scan, mode: 'live', error: null }));
        if (TERMINAL.has(scan.status)) source?.close();
      });
      for (const type of [
        'queued',
        'page_started',
        'page_done',
        'analysing',
        'done',
        'failed',
        'cancelled',
      ]) {
        source.addEventListener(type, (e) =>
          pushEvent(JSON.parse((e as MessageEvent<string>).data) as ScanEvent),
        );
      }
      source.onerror = () => {
        source?.close();
        if (!cancelled)
          setState((s) => (s.scan && TERMINAL.has(s.scan.status) ? s : { ...s, mode: 'polling' }));
        void poll();
      };
    }

    return () => {
      cancelled = true;
      source?.close();
      if (timer) clearTimeout(timer);
    };
  }, [scanId]);

  return state;
}
