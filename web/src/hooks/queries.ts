'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CredentialsInput } from '@uidrift/shared';
import { api, ApiError } from '@/lib/api';

export const keys = {
  me: ['me'] as const,
  myScans: ['me', 'scans'] as const,
  demos: ['demos'] as const,
  scan: (id: string) => ['scan', id] as const,
  report: (id: string) => ['report', id] as const,
};

const noRetryOn4xx = (count: number, err: unknown) =>
  !(err instanceof ApiError && err.status >= 400 && err.status < 500) && count < 2;

export function useReport(scanId: string) {
  return useQuery({
    queryKey: keys.report(scanId),
    queryFn: () => api.getReport(scanId),
    staleTime: Infinity,
    retry: noRetryOn4xx,
  });
}

export function useDemos() {
  return useQuery({ queryKey: keys.demos, queryFn: api.demos, staleTime: 5 * 60_000 });
}

export function useMe() {
  return useQuery({ queryKey: keys.me, queryFn: api.me, staleTime: 5 * 60_000, retry: false });
}

export function useMyScans(enabled: boolean) {
  return useQuery({ queryKey: keys.myScans, queryFn: api.myScans, enabled });
}

export function useCreateScan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createScan,
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.myScans }),
  });
}

export function useCreateSourceScan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createSourceScan,
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.myScans }),
  });
}

export function useCancelScan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.cancelScan,
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.myScans }),
  });
}

export function useAuth(mode: 'login' | 'signup') {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CredentialsInput) =>
      mode === 'login' ? api.login(input) : api.signup(input),
    onSuccess: (user) => {
      qc.setQueryData(keys.me, user);
      void qc.invalidateQueries({ queryKey: keys.myScans });
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.logout,
    onSuccess: () => {
      qc.setQueryData(keys.me, null);
      qc.removeQueries({ queryKey: keys.myScans });
    },
  });
}

/** Pings /health so a sleeping free-tier server starts waking up as soon as the page loads. */
export function useServerStatus() {
  return useQuery({
    queryKey: ['health'],
    queryFn: api.health,
    retry: 6,
    retryDelay: (n) => Math.min(2000 * 2 ** n, 10_000),
    staleTime: 60_000,
  });
}
