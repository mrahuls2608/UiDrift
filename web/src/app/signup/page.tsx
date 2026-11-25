import type { Metadata } from 'next';
import { AuthForm } from '@/features/auth/AuthForm';

export const metadata: Metadata = { title: 'Sign up' };

export default function SignupPage() {
  return (
    <div className="flex justify-center px-4 py-16">
      <AuthForm mode="signup" />
    </div>
  );
}
