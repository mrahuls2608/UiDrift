import { History, LineChart, RefreshCw } from 'lucide-react';

const POINTS = [
  {
    icon: History,
    title: 'Keep every scan',
    text: 'Saved scans never expire while your account exists.',
  },
  {
    icon: RefreshCw,
    title: 'Re-scan in one click',
    text: 'Check the same site after each release.',
  },
  {
    icon: LineChart,
    title: 'Track the trend',
    text: 'Watch your consistency score climb over time.',
  },
];

export function AuthAside() {
  return (
    <div className="hidden flex-col gap-8 lg:flex">
      <div className="flex flex-col gap-3">
        <p className="eyebrow">Accounts are optional</p>
        <h2 className="text-2xl font-bold">Turn a one-off audit into a habit.</h2>
      </div>
      <ul className="flex flex-col gap-6">
        {POINTS.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-primary">
              <Icon aria-hidden size={20} />
            </span>
            <span className="flex flex-col gap-1">
              <span className="font-semibold">{title}</span>
              <span className="text-sm text-muted">{text}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
