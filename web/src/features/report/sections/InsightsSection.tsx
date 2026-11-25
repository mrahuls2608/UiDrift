import { AlertTriangle, Bot, Lightbulb, ShieldCheck } from 'lucide-react';
import type { InsightImpact, LlmProvider, ReportDTO } from '@uidrift/shared';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Section } from '../Section';

const IMPACT: Record<InsightImpact, BadgeTone> = {
  high: 'danger',
  medium: 'warning',
  low: 'neutral',
};
const PROVIDER: Record<LlmProvider, string> = {
  anthropic: 'Claude',
  openai: 'OpenAI',
  'openai-compatible': 'OpenAI-compatible model',
};
const CATEGORY: Record<string, string> = {
  components: 'Components',
  colors: 'Colors',
  typography: 'Typography',
  spacing: 'Spacing',
  radius: 'Radius',
  accessibility: 'Accessibility',
};

export default function InsightsSection({ report }: { report: ReportDTO }) {
  const { insights } = report;
  const byLlm = insights.engine === 'llm';
  return (
    <Section
      eyebrow="03 · Insights"
      id="insights"
      title="What to fix first"
      description="Prioritized recommendations computed from this audit."
    >
      <Card className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {byLlm ? (
            <Badge tone="neutral">
              <Bot aria-hidden size={12} /> Written by{' '}
              {insights.provider ? PROVIDER[insights.provider] : 'LLM'}
              {insights.model ? ` · ${insights.model}` : ''}
            </Badge>
          ) : (
            <Badge tone="success">
              <ShieldCheck aria-hidden size={12} /> Rule-based · no AI
            </Badge>
          )}
          <span className="text-xs text-muted">
            Scores, groups and tokens are computed deterministically either way.
          </span>
        </div>
        {insights.fallbackReason && (
          <p
            role="status"
            className="flex items-start gap-2 rounded-md bg-warning/10 px-4 py-3 text-sm text-warning"
          >
            <AlertTriangle aria-hidden size={16} className="mt-1 shrink-0" />
            <span>
              {insights.provider ? PROVIDER[insights.provider] : 'The LLM'} couldn&apos;t be used (
              {insights.fallbackReason}) — showing the rule-based insights instead.
            </span>
          </p>
        )}
        <p className="text-base">{insights.summary}</p>
      </Card>

      {insights.recommendations.length > 0 && (
        <ol className="grid gap-4 lg:grid-cols-2">
          {insights.recommendations.map((r, i) => (
            <Card as="li" key={`${r.title}-${i}`} className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
                  {i + 1}
                </span>
                <Badge tone={IMPACT[r.impact]}>{r.impact} impact</Badge>
                <Badge>{CATEGORY[r.category] ?? r.category}</Badge>
              </div>
              <h3 className="flex items-start gap-2 text-base font-semibold">
                <Lightbulb aria-hidden size={18} className="mt-1 shrink-0 text-accent" />
                {r.title}
              </h3>
              <p className="text-sm text-muted">{r.detail}</p>
            </Card>
          ))}
        </ol>
      )}

      {insights.tokenNames.length > 0 && (
        <Card>
          <h3 className="mb-4 text-base font-semibold">Suggested token names</h3>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {insights.tokenNames.map((t) => (
              <li key={`${t.name}-${t.value}`} className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="h-8 w-8 shrink-0 rounded-full border border-border shadow-sm"
                  style={{ backgroundColor: /^#[0-9a-f]{6}$/i.test(t.value) ? t.value : undefined }}
                />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-mono text-sm font-semibold">--color-{t.name}</span>
                  <span className="truncate text-xs text-muted">
                    {t.value} · {t.reason}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </Section>
  );
}
