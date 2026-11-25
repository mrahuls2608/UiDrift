'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLogout, useMe } from '@/hooks/queries';
import { buttonClasses } from '@/components/ui/Button';
import { ThemeToggle } from './ThemeToggle';
import { Logo } from './Logo';

export function SiteHeader() {
  const { data: user } = useMe();
  const logout = useLogout();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur">
      <nav
        aria-label="Main"
        className="mx-auto flex h-16 max-w-content items-center justify-between gap-4 px-4"
      >
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-sm font-mono font-semibold text-text"
          >
            <Logo />
            uidrift
          </Link>
          <ul className="hidden items-center gap-1 md:flex">
            <li>
              <Link href="/#features" className={buttonClasses('ghost', 'sm')}>
                Features
              </Link>
            </li>
            <li>
              <Link href="/#how" className={buttonClasses('ghost', 'sm')}>
                How it works
              </Link>
            </li>
          </ul>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          {user ? (
            <>
              <Link href="/dashboard" className={buttonClasses('ghost', 'sm')}>
                Dashboard
              </Link>
              <button
                type="button"
                className={buttonClasses('secondary', 'sm')}
                onClick={() => logout.mutate(undefined, { onSuccess: () => router.push('/') })}
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className={buttonClasses('ghost', 'sm')}>
                Log in
              </Link>
              <Link href="/signup" className={buttonClasses('primary', 'sm')}>
                Sign up
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
