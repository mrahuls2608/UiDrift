import type { Metadata } from 'next';
import { ScanProgressView } from '@/features/scan/ScanProgressView';

export const metadata: Metadata = { title: 'Scanning', robots: { index: false } };

export default async function ScanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-prose px-4 py-12">
      <h1 className="mb-6 text-xl font-bold">Scan in progress</h1>
      <ScanProgressView scanId={id} />
    </div>
  );
}
