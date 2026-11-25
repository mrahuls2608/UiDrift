import Link from 'next/link';
import { Github } from 'lucide-react';
import { Logo } from './Logo';

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex max-w-content flex-col gap-6 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <Link
            href="/"
            className="flex items-center gap-2 self-start rounded-sm font-mono font-semibold"
          >
            <Logo size={20} />
            uidrift
          </Link>
          <p className="text-sm text-muted">
            Scans public pages only · up to 10 per scan · free tier friendly.
          </p>
        </div>
        <a
          href="https://github.com/mrahuls2608/UiDrift"
          className="inline-flex min-h-11 items-center gap-2 self-start rounded-md text-sm text-muted hover:text-text"
          target="_blank"
          rel="noreferrer"
        >
          <Github aria-hidden size={16} />
          Source on GitHub
        </a>
      </div>
    </footer>
  );
}
