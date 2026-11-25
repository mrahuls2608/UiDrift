import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { axe } from 'jest-axe';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ScanForm } from '@/features/scan/ScanForm';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));

function renderForm() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <ScanForm />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  push.mockReset();
  vi.restoreAllMocks();
});

describe('ScanForm', () => {
  it('validates the URL before calling the API', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const { container } = renderForm();
    await userEvent.click(screen.getByRole('button', { name: 'Scan' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('URL is required');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('starts a scan and navigates to the progress page', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ scanId: 'abc123', scan: {} }), { status: 202 }),
      );
    renderForm();
    await userEvent.type(screen.getByLabelText('Website URL'), 'example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Scan' }));
    await vi.waitFor(() => expect(push).toHaveBeenCalledWith('/scan/abc123'));
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe('/api/v1/scans');
    expect(JSON.parse(String(init?.body))).toEqual({ url: 'https://example.com', maxPages: 10 });
  });

  it('shows API errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          error: { code: 'INVALID_URL', message: 'Only public http/https URLs are allowed.' },
        }),
        { status: 400 },
      ),
    );
    renderForm();
    await userEvent.type(screen.getByLabelText('Website URL'), 'http://10.0.0.1');
    await userEvent.click(screen.getByRole('button', { name: 'Scan' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Only public http/https URLs are allowed.',
    );
  });
});
