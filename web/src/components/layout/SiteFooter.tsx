import Link from 'next/link';
import { Github } from 'lucide-react';
import { Logo } from './Logo';

export function SiteFooter() {
  return (
    <footer className="px-4 pb-6">
      <div className="glass mx-auto flex max-w-content flex-col gap-6 rounded-lg px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <Link href="/" className="flex items-center gap-2 self-start rounded-full font-bold">
            <Logo size={24} />
            UIDrift
          </Link>
          <p className="text-sm text-muted">
            Website and source-code UI audits · deterministic, AI optional.
          </p>
        </div>
        <a
          href="https://github.com/mrahuls2608/UiDrift"
          className="inline-flex min-h-11 items-center gap-2 self-start rounded-full text-sm text-muted hover:text-text"
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
