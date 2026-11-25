import type {
  ApiError as ApiErrorBody,
  CreateScanInput,
  CredentialsInput,
  DemoDTO,
  ExportFormat,
  ReportDTO,
  ScanDTO,
  UserDTO,
} from '@uidrift/shared';

export const API_BASE = '/api/v1';
export const SSE_BASE = process.env.NEXT_PUBLIC_SSE_URL || API_BASE;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...init.headers },
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Could not reach the server. Check your connection.');
  }
  const text = await res.text();
  const data = text ? (JSON.parse(text) as unknown) : null;
  if (!res.ok) {
    const body = data as Partial<ApiErrorBody> | null;
    throw new ApiError(
      res.status,
      body?.error?.code ?? 'HTTP_ERROR',
      body?.error?.message ?? `Request failed (${res.status}).`,
    );
  }
  return data as T;
}

export const api = {
  health: () => request<{ status: string }>('/health'),
  createScan: (input: Partial<CreateScanInput> & { url: string }) =>
    request<{ scanId: string; scan: ScanDTO }>('/scans', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  getScan: (id: string) => request<{ scan: ScanDTO }>(`/scans/${id}`).then((r) => r.scan),
  cancelScan: (id: string) => request<{ deleted: boolean }>(`/scans/${id}`, { method: 'DELETE' }),
  getReport: (scanId: string) =>
    request<{ report: ReportDTO }>(`/reports/${scanId}`).then((r) => r.report),
  exportUrl: (scanId: string, format: ExportFormat) =>
    `${API_BASE}/reports/${scanId}/export?format=${format}`,
  demos: () => request<{ demos: DemoDTO[] }>('/demos').then((r) => r.demos),
  me: () => request<{ user: UserDTO | null }>('/me').then((r) => r.user),
  myScans: () => request<{ scans: ScanDTO[] }>('/me/scans').then((r) => r.scans),
  signup: (input: CredentialsInput) =>
    request<{ user: UserDTO }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(input),
    }).then((r) => r.user),
  login: (input: CredentialsInput) =>
    request<{ user: UserDTO }>('/auth/login', { method: 'POST', body: JSON.stringify(input) }).then(
      (r) => r.user,
    ),
  logout: () => request<{ ok: boolean }>('/auth/logout', { method: 'POST' }),
};
