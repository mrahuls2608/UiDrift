import type { ReportDTO } from '@uidrift/shared';
import { StatCard } from '@/components/ui/StatCard';
import type { BadgeTone } from '@/components/ui/Badge';

const NAMES = {
  button: 'Buttons',
  input: 'Inputs',
  heading: 'Headings',
  link: 'Links',
  card: 'Cards',
} as const;

function tone(actual: number, ideal: number): [BadgeTone, string] {
  if (actual <= ideal) return ['success', 'On target'];
  if (actual <= ideal * 2) return ['warning', 'Drifting'];
  return ['danger', 'Chaotic'];
}

export function SummaryCards({ report }: { report: ReportDTO }) {
  const { summary } = report;
  const cards = [
    ...summary.components
      .filter((c) => c.variants > 0)
      .map((c) => ({ title: NAMES[c.type], actual: c.variants, ideal: c.ideal, unit: 'variant' })),
    { title: 'Colors', ...summary.colors, unit: 'color' },
    { title: 'Font sizes', ...summary.fontSizes, unit: 'size' },
    { title: 'Spacing values', ...summary.spacing, unit: 'value' },
    { title: 'Border radii', ...summary.radius, unit: 'value' },
  ];
  return (
    <section
      id="summary"
      aria-labelledby="summary-heading"
      className="scroll-mt-16 flex flex-col gap-4"
    >
      <h2 id="summary-heading" className="text-xl font-bold">
        Summary
      </h2>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => {
          const [t, label] = tone(c.actual, c.ideal);
          return (
            <li key={c.title}>
              <StatCard
                title={c.title}
                value={`${c.actual} ${c.unit}${c.actual === 1 ? '' : 's'}`}
                suggestion={
                  c.actual > c.ideal ? `→ suggest ${c.ideal}` : `Ideal is ${c.ideal} or fewer`
                }
                tone={t}
                toneLabel={label}
              />
            </li>
          );
        })}
        <li>
          <StatCard
            title="Accessibility issues"
            value={summary.a11yIssues}
            suggestion={
              summary.a11yIssues ? 'See the Accessibility section' : 'No serious issues found'
            }
            tone={summary.a11yIssues ? 'danger' : 'success'}
            toneLabel={summary.a11yIssues ? 'Fix' : 'Clean'}
          />
        </li>
      </ul>
    </section>
  );
}
