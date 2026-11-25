import { Github } from 'lucide-react';

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-content flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-muted sm:flex-row">
        <p>UIDrift · Scans public pages only, up to 10 per scan.</p>
        <a
          href="https://github.com/mrahuls2608/UiDrift"
          className="inline-flex items-center gap-2 rounded-sm hover:text-text"
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
