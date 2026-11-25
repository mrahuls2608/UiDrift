'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, LogOut, Plus } from 'lucide-react';
import { useLogout, useMe } from '@/hooks/queries';
import { buttonClasses } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { ThemeToggle } from './ThemeToggle';
import { Logo } from './Logo';

const PUBLIC_LINKS = [
  { href: '/#features', label: 'Features' },
  { href: '/#how', label: 'How it works' },
  { href: '/#demo', label: 'Demo' },
  { href: '/#security', label: 'Security' },
];

export function SiteHeader() {
  const { data: user } = useMe();
  const logout = useLogout();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 px-4 pt-4">
      <nav
        aria-label="Main"
        className="glass mx-auto flex h-16 max-w-content items-center justify-between gap-4 rounded-full px-4 sm:px-6"
      >
        <Link
          href={user ? '/dashboard' : '/'}
          className="flex items-center gap-2 rounded-full font-bold text-text"
        >
          <Logo />
          UIDrift
        </Link>
        {!user && (
          <ul className="hidden items-center gap-1 md:flex">
            {PUBLIC_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={buttonClasses('ghost', 'sm')}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-center gap-1">
          <ThemeToggle />
          {user ? (
            <>
              <Link
                href="/dashboard"
                aria-current={pathname === '/dashboard' ? 'page' : undefined}
                className={cn(
                  buttonClasses('ghost', 'sm'),
                  pathname === '/dashboard' && 'text-text',
                )}
              >
                <LayoutDashboard aria-hidden size={16} />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
              <Link href="/new" className={buttonClasses('primary', 'sm')}>
                <Plus aria-hidden size={16} />
                <span className="hidden sm:inline">New audit</span>
              </Link>
              <button
                type="button"
                className={buttonClasses('ghost', 'sm')}
                onClick={() => logout.mutate(undefined, { onSuccess: () => router.push('/') })}
                aria-label={`Log out ${user.email}`}
                title={user.email}
              >
                <LogOut aria-hidden size={16} />
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className={buttonClasses('ghost', 'sm')}>
                Log in
              </Link>
              <Link href="/signup" className={buttonClasses('primary', 'sm')}>
                Get started
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
