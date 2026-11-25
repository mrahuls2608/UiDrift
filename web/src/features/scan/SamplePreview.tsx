import { ScoreRing } from '@/components/ui/ScoreRing';
import { StatCard } from '@/components/ui/StatCard';
import { Card } from '@/components/ui/Card';

/** A static, illustrative slice of a report so visitors see the output before scanning. */
export function SamplePreview() {
  return (
    <section aria-labelledby="sample-heading" className="mx-auto max-w-content px-4 pb-16">
      <h2 id="sample-heading" className="mb-8 text-xl font-bold">
        What a report looks like
      </h2>
      <Card className="grid gap-6 lg:grid-cols-[auto_1fr] lg:items-center">
        <div className="flex justify-center">
          <ScoreRing value={62} size={140} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            title="Buttons"
            value="14 variants"
            suggestion="Suggest 3"
            tone="danger"
            toneLabel="Drift"
          />
          <StatCard
            title="Colors"
            value="37 colors"
            suggestion="Suggest 12"
            tone="warning"
            toneLabel="Drift"
          />
          <StatCard
            title="Radius"
            value="4 values"
            suggestion="Suggest 4"
            tone="success"
            toneLabel="OK"
          />
        </div>
      </Card>
      <p className="mt-2 text-sm text-muted">Example data for illustration.</p>
    </section>
  );
}
