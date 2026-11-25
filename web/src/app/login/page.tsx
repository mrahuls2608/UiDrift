import type { Metadata } from 'next';
import { AuthForm } from '@/features/auth/AuthForm';

export const metadata: Metadata = { title: 'Log in' };

export default function LoginPage() {
  return (
    <div className="flex justify-center px-4 py-16">
      <AuthForm mode="login" />
    </div>
  );
}
