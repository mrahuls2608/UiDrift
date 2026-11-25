import Link from 'next/link';
import { SearchX } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { buttonClasses } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-prose px-4 py-16">
      <EmptyState
        icon={SearchX}
        title="Page not found"
        description="The page you are looking for does not exist."
        action={
          <Link href="/" className={buttonClasses('primary')}>
            Go home
          </Link>
        }
      />
    </div>
  );
}
