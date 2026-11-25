import type { Metadata } from 'next';
import { NewAuditForm } from '@/features/audit/NewAuditForm';

export const metadata: Metadata = { title: 'New audit', robots: { index: false } };

export default function NewAuditPage() {
  return (
    <div className="mx-auto max-w-[880px] px-4 py-12">
      <p className="eyebrow mb-2">New audit</p>
      <h1 className="mb-2 text-2xl font-bold">What should we audit?</h1>
      <p className="mb-8 text-muted">
        Pick a live website or your source code. AI is optional — the analysis is the same either
        way.
      </p>
      <NewAuditForm />
    </div>
  );
}
