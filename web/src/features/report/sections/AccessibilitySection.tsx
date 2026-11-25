import { ShieldCheck, ExternalLink } from 'lucide-react';
import type { A11yImpact, RawA11yIssue, ReportDTO } from '@uidrift/shared';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { pathOf, plural } from '@/lib/format';
import { Section } from '../Section';

const TONE: Record<A11yImpact, BadgeTone> = {
  critical: 'danger',
  serious: 'danger',
  moderate: 'warning',
  minor: 'neutral',
};
const ORDER: Record<A11yImpact, number> = { critical: 0, serious: 1, moderate: 2, minor: 3 };
const VISIBLE = 4;

interface RuleGroup {
  id: string;
  impact: A11yImpact;
  help: string;
  description: string;
  helpUrl?: string;
  nodes: Array<Pick<RawA11yIssue, 'selector' | 'page'>>;
}

/** One card per axe rule, listing the affected elements — far easier to act on than one card per node. */
export function groupByRule(issues: RawA11yIssue[]): RuleGroup[] {
  const map = new Map<string, RuleGroup>();
  for (const i of issues) {
    const g = map.get(i.id) ?? {
      id: i.id,
      impact: i.impact,
      help: i.help,
      description: i.description,
      helpUrl: i.helpUrl,
      nodes: [],
    };
    if (ORDER[i.impact] < ORDER[g.impact]) g.impact = i.impact;
    g.nodes.push({ selector: i.selector, page: i.page });
    map.set(i.id, g);
  }
  return [...map.values()].sort(
    (a, b) => ORDER[a.impact] - ORDER[b.impact] || b.nodes.length - a.nodes.length,
  );
}

function NodeRow({ node }: { node: Pick<RawA11yIssue, 'selector' | 'page'> }) {
  return (
    <li className="grid gap-1 border-t border-border py-2 font-mono text-xs sm:grid-cols-[1fr_auto] sm:gap-4">
      <span className="break-all text-text">{node.selector}</span>
      <span className="break-all text-muted">{pathOf(node.page)}</span>
    </li>
  );
}

export default function AccessibilitySection({ report }: { report: ReportDTO }) {
  const groups = groupByRule(report.a11y);
  return (
    <Section
      eyebrow="07 · WCAG 2.1 AA"
      id="accessibility"
      title="Accessibility"
      description={`${plural(report.a11y.length, 'issue')} across ${plural(groups.length, 'rule')}, found by axe-core (serious and critical, plus the top moderate ones).`}
    >
      {groups.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No serious issues found"
          description="Automated checks catch around a third of issues — still test with a keyboard and screen reader."
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {groups.map((g) => (
            <Card as="li" key={g.id} className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={TONE[g.impact]}>{g.impact}</Badge>
                <Badge>{plural(g.nodes.length, 'element')}</Badge>
                <h3 className="text-base font-semibold">{g.help}</h3>
              </div>
              <p className="text-sm text-muted">{g.description}</p>
              <ul>
                {g.nodes.slice(0, VISIBLE).map((n) => (
                  <NodeRow key={`${n.page}-${n.selector}`} node={n} />
                ))}
              </ul>
              {g.nodes.length > VISIBLE && (
                <details>
                  <summary className="cursor-pointer rounded-sm text-sm text-muted hover:text-text">
                    Show {g.nodes.length - VISIBLE} more
                  </summary>
                  <ul>
                    {g.nodes.slice(VISIBLE).map((n) => (
                      <NodeRow key={`${n.page}-${n.selector}`} node={n} />
                    ))}
                  </ul>
                </details>
              )}
              {g.helpUrl && (
                <a
                  href={g.helpUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center gap-1 self-start rounded-sm text-sm font-medium text-primary underline"
                >
                  How to fix <span className="sr-only">{g.help}</span>
                  <ExternalLink aria-hidden size={14} />
                </a>
              )}
            </Card>
          ))}
        </ul>
      )}
    </Section>
  );
}
