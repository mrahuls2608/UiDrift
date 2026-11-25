import type { Metadata } from 'next';
import { DashboardView } from '@/features/dashboard/DashboardView';

export const metadata: Metadata = { title: 'Dashboard', robots: { index: false } };

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-content px-4 py-12">
      <DashboardView />
    </div>
  );
}
