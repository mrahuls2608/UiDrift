'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { credentialsSchema } from '@uidrift/shared';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/queries';

/** Seeded demo account (see `npm run seed`). Hide the shortcut with NEXT_PUBLIC_DEMO_LOGIN=false. */
const DEMO = { email: 'demo@uidrift.dev', password: 'Demo@12345' };
const SHOW_DEMO = process.env.NEXT_PUBLIC_DEMO_LOGIN !== 'false';

/** Only same-site paths are allowed as a post-login destination (no open redirects). */
function safeNext(next: string | null): string {
  return next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\')
    ? next
    : '/dashboard';
}

export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    name?: string;
    form?: string;
  }>({});
  const auth = useAuth(mode);
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get('next'));
  const isLogin = mode === 'login';

  const send = (input: { email: string; password: string; name?: string }) => {
    const parsed = credentialsSchema.safeParse(input);
    if (!parsed.success) {
      const fields = parsed.error.flatten().fieldErrors;
      setErrors({
        email: fields.email?.[0],
        password: fields.password?.[0],
        name: fields.name?.[0],
      });
      return;
    }
    setErrors({});
    auth.mutate(parsed.data, {
      onSuccess: () => router.replace(next),
      onError: (err) => setErrors({ form: err.message }),
    });
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    send({ email, password, ...(isLogin || !name.trim() ? {} : { name }) });
  };

  const useDemo = () => {
    setEmail(DEMO.email);
    setPassword(DEMO.password);
    send(DEMO);
  };

  return (
    <Card className="w-full max-w-form sm:p-8">
      <p className="eyebrow mb-2">{isLogin ? 'Welcome back' : 'Free forever'}</p>
      <h1 className="mb-6 text-xl font-bold">
        {isLogin ? 'Log in to UIDrift' : 'Create your account'}
      </h1>
      {isLogin && params.get('next') && (
        <p role="status" className="mb-4 rounded-md bg-surface-2 px-4 py-3 text-sm text-muted">
          Please log in to continue.
        </p>
      )}
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        {!isLogin && (
          <Input
            label="Name (optional)"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
          />
        )}
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
          {isLogin ? 'Log in' : 'Create account'}
        </Button>
      </form>
      {isLogin && SHOW_DEMO && (
        <div className="mt-4 flex flex-col gap-2 rounded-md bg-surface-2 p-4">
          <p className="text-sm text-muted">
            Exploring? Use the demo account{' '}
            <span className="font-mono text-text">{DEMO.email}</span>.
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={useDemo}
            disabled={auth.isPending}
            className="self-start"
          >
            <Sparkles aria-hidden size={16} /> Log in as demo user
          </Button>
        </div>
      )}
      <p className="mt-4 text-sm text-muted">
        {isLogin ? 'New here? ' : 'Already have an account? '}
        <Link
          href={`${isLogin ? '/signup' : '/login'}${next !== '/dashboard' ? `?next=${encodeURIComponent(next)}` : ''}`}
          className="font-semibold text-primary underline"
        >
          {isLogin ? 'Create an account' : 'Log in'}
        </Link>
      </p>
    </Card>
  );
}
