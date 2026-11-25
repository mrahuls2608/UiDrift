import type { Metadata } from 'next';
import { AuthForm } from '@/features/auth/AuthForm';
import { AuthAside } from '@/features/auth/AuthAside';

export const metadata: Metadata = { title: 'Sign up' };

export default function Page() {
  return (
    <div className="mx-auto grid max-w-content items-center gap-12 px-4 py-12 lg:grid-cols-2 lg:py-24">
      <AuthAside />
      <div className="flex justify-center lg:justify-end">
        <AuthForm mode="signup" />
      </div>
    </div>
  );
}
