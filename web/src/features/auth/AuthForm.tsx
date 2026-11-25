'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { credentialsSchema } from '@uidrift/shared';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/queries';

export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const auth = useAuth(mode);
  const router = useRouter();
  const isLogin = mode === 'login';

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = credentialsSchema.safeParse({ email, password });
    if (!parsed.success) {
      const fields = parsed.error.flatten().fieldErrors;
      setErrors({ email: fields.email?.[0], password: fields.password?.[0] });
      return;
    }
    setErrors({});
    auth.mutate(parsed.data, {
      onSuccess: () => router.push('/dashboard'),
      onError: (err) => setErrors({ form: err.message }),
    });
  };

  return (
    <Card className="w-full max-w-form">
      <h1 className="mb-6 text-xl font-bold">{isLogin ? 'Log in' : 'Create your account'}</h1>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />
        <Input
          label="Password"
          type="password"
          autoComplete={isLogin ? 'current-password' : 'new-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          helperText={isLogin ? undefined : 'At least 8 characters.'}
        />
        {errors.form && (
          <p role="alert" className="text-sm text-danger">
            {errors.form}
          </p>
        )}
        <Button type="submit" loading={auth.isPending}>
          {isLogin ? 'Log in' : 'Sign up'}
        </Button>
      </form>
      <p className="mt-4 text-sm text-muted">
        {isLogin ? 'New here? ' : 'Already have an account? '}
        <Link href={isLogin ? '/signup' : '/login'} className="font-medium text-primary underline">
          {isLogin ? 'Create an account' : 'Log in'}
        </Link>
      </p>
    </Card>
  );
}
