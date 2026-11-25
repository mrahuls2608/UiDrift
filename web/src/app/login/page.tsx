import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthForm } from '@/features/auth/AuthForm';
import { AuthAside } from '@/features/auth/AuthAside';

export const metadata: Metadata = { title: 'Log in' };

export default function Page() {
  return (
    <div className="mx-auto grid max-w-content items-center gap-12 px-4 py-12 lg:grid-cols-2 lg:py-24">
      <AuthAside />
      <div className="flex justify-center lg:justify-end">
        <Suspense>
          <AuthForm mode="login" />
        </Suspense>
      </div>
    </div>
  );
}
