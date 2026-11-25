import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { axe } from 'jest-axe';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReportDTO } from '@uidrift/shared';
import { NewAuditForm } from '@/features/audit/NewAuditForm';
import { Segmented } from '@/components/ui/Segmented';
import InsightsSection from '@/features/report/sections/InsightsSection';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));

function renderForm() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <NewAuditForm />
    </QueryClientProvider>,
  );
}

const ok = () =>
  vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(
      new Response(JSON.stringify({ scanId: 'abc123', scan: {} }), { status: 202 }),
    );
const sentBody = (spy: ReturnType<typeof ok>) => JSON.parse(String(spy.mock.calls[0]?.[1]?.body));

beforeEach(() => {
  push.mockReset();
  vi.restoreAllMocks();
});

describe('NewAuditForm — website', () => {
  it('validates the URL before calling the API and is accessible', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const { container } = renderForm();
    await userEvent.click(screen.getByRole('button', { name: 'Start audit' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('URL is required');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('starts a rule-based website audit and opens the progress page', async () => {
    const spy = ok();
    renderForm();
    await userEvent.type(screen.getByLabelText('Website URL'), 'example.com');
    await userEvent.selectOptions(screen.getByLabelText('Pages to scan'), '3');
    await userEvent.click(screen.getByRole('button', { name: 'Start audit' }));
    await vi.waitFor(() => expect(push).toHaveBeenCalledWith('/scan/abc123'));
    expect(spy.mock.calls[0]?.[0]).toBe('/api/v1/scans');
    expect(sentBody(spy)).toEqual({ url: 'https://example.com', maxPages: 3 });
  });

  it('sends the LLM settings typed by the user, and requires a model for OpenAI', async () => {
    const spy = ok();
    renderForm();
    await userEvent.type(screen.getByLabelText('Website URL'), 'https://example.com');
    await userEvent.click(screen.getByLabelText(/Use my own LLM/));
    await userEvent.selectOptions(screen.getByLabelText('Provider'), 'openai');
    await userEvent.type(screen.getByLabelText('API key'), 'sk-test-123456');
    await userEvent.click(screen.getByRole('button', { name: 'Start audit' }));
    expect(await screen.findByText('Enter a model name')).toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
    await userEvent.type(screen.getByLabelText('Model'), 'gpt-4o-mini');
    await userEvent.click(screen.getByRole('button', { name: 'Start audit' }));
    await vi.waitFor(() => expect(spy).toHaveBeenCalled());
    expect(sentBody(spy).llm).toEqual({
      provider: 'openai',
      apiKey: 'sk-test-123456',
      model: 'gpt-4o-mini',
    });
  });

  it('uses a password field for the key', async () => {
    renderForm();
    await userEvent.click(screen.getByLabelText(/Use my own LLM/));
    expect(screen.getByLabelText('API key')).toHaveAttribute('type', 'password');
    expect(screen.getByLabelText('API key')).toHaveAttribute('autocomplete', 'off');
  });
});

describe('NewAuditForm — source code', () => {
  it('audits pasted code without any LLM', async () => {
    const spy = ok();
    renderForm();
    await userEvent.click(screen.getByLabelText(/Source code/));
    await userEvent.click(screen.getByLabelText('Paste code'));
    await userEvent.type(screen.getByLabelText('File 1 contents'), '.btn {{ color: red; }');
    await userEvent.click(screen.getByRole('button', { name: 'Start audit' }));
    await vi.waitFor(() => expect(push).toHaveBeenCalledWith('/scan/abc123'));
    expect(spy.mock.calls[0]?.[0]).toBe('/api/v1/scans/source');
    expect(sentBody(spy)).toEqual({
      source: {
        type: 'files',
        label: 'Pasted code',
        files: [{ path: 'styles.css', content: '.btn { color: red; }' }],
      },
    });
  });

  it('validates GitHub URLs', async () => {
    const spy = vi.spyOn(globalThis, 'fetch');
    renderForm();
    await userEvent.click(screen.getByLabelText(/Source code/));
    await userEvent.click(screen.getByLabelText('GitHub repo'));
    await userEvent.type(
      screen.getByLabelText('Public GitHub repository'),
      'https://gitlab.com/a/b',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Start audit' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/public GitHub repository URL/);
    expect(spy).not.toHaveBeenCalled();
  });

  it('asks for files before uploading', async () => {
    renderForm();
    await userEvent.click(screen.getByLabelText(/Source code/));
    await userEvent.click(screen.getByRole('button', { name: 'Start audit' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Choose a ZIP file or a folder first.',
    );
  });
});

describe('Segmented', () => {
  function Harness() {
    const [v, setV] = useState('a');
    return (
      <Segmented
        legend="Pick one"
        value={v}
        onChange={setV}
        options={[
          { value: 'a', label: 'Alpha' },
          { value: 'b', label: 'Beta' },
        ]}
      />
    );
  }

  it('is a labelled radio group with keyboard support', async () => {
    const { container } = render(<Harness />);
    expect(screen.getByRole('group', { name: 'Pick one' })).toBeInTheDocument();
    const alpha = screen.getByRole('radio', { name: 'Alpha' });
    expect(alpha).toBeChecked();
    alpha.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'Beta' })).toBeChecked();
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('InsightsSection', () => {
  const base = {
    insights: {
      engine: 'rules',
      summary: 'acme scores 56/100 (Drifting).',
      recommendations: [
        {
          title: 'Consolidate 11 buttons into 3',
          detail: 'Keep #2563eb.',
          impact: 'high',
          category: 'components',
        },
      ],
      tokenNames: [{ value: '#2563eb', name: 'primary', reason: 'Most used button' }],
    },
  } as unknown as ReportDTO;

  it('labels rule-based insights as no-AI and lists recommendations and token names', async () => {
    const { container } = render(<InsightsSection report={base} />);
    expect(screen.getByText(/Rule-based · no AI/)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Consolidate 11 buttons into 3' }),
    ).toBeInTheDocument();
    expect(screen.getByText('--color-primary')).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('shows which LLM wrote the insights and why it fell back', () => {
    render(
      <InsightsSection
        report={
          {
            ...base,
            insights: {
              ...base.insights,
              provider: 'anthropic',
              fallbackReason: 'Anthropic rejected the API key.',
            },
          } as ReportDTO
        }
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Claude couldn’t be used (Anthropic rejected the API key.)'.replace('’', "'"),
    );
    render(
      <InsightsSection
        report={
          {
            ...base,
            insights: { ...base.insights, engine: 'llm', provider: 'openai', model: 'gpt-x' },
          } as ReportDTO
        }
      />,
    );
    expect(screen.getByText(/Written by OpenAI · gpt-x/)).toBeInTheDocument();
  });
});
