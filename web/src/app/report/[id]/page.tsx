import type { Metadata } from 'next';
import { ReportView } from '@/features/report/ReportView';

export const metadata: Metadata = { title: 'Report' };

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-content px-4 py-6 lg:py-12">
      <ReportView scanId={id} />
    </div>
  );
}
