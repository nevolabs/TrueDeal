'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, ApiError } from '@/lib/client';
import { useSession } from '@/lib/session-context';
import type { User } from '@/lib/types';
import { safeNext } from '@/lib/validation';

function LoginInner() {
  const search = useSearchParams();
  const router = useRouter();
  const { refresh } = useSession();
  const join = search.get('mode') === 'join';
  const next = safeNext(search.get('next'));

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!email || !password || (join && (!name || !city))) {
      setError('Please fill in every field.');
      return;
    }
    setBusy(true);
    try {
      if (join) {
        const result = await api.post<{ user: User | null; confirmationRequired: boolean }>('/api/auth/signup', { name, email, city, password });
        if (result.confirmationRequired) {
          setMessage('Check your email to confirm your account, then sign in.');
          return;
        }
      } else {
        await api.post<{ user: User }>('/api/auth/signin', { email, password });
      }
      await refresh();
      router.push(next || '/browse');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="site-shell grid max-w-[1000px] gap-10 py-12 md:grid-cols-2 md:gap-20 md:py-20">
      <div>
        <h1 className="page-title">{join ? 'Create your account' : 'Sign in'}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{join ? 'One account lets you buy and sell.' : 'Welcome back.'}</p>
        {next.startsWith('/checkout') && (
          <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Sign in to continue to checkout.
          </p>
        )}
        <form onSubmit={submit} aria-busy={busy} aria-describedby={error ? 'auth-error' : undefined} className="mt-8 flex flex-col gap-5">
          {join && (
            <label className="text-sm">
              Full name
              <input required autoComplete="name" maxLength={100} className="mt-1 w-full" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
          )}
          <label className="text-sm">
            Email
            <input
              type="email"
              required
              autoComplete="email"
              autoCorrect="off"
              spellCheck={false}
              className="mt-1 w-full"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          {join && (
            <label className="text-sm">
              City
              <input required autoComplete="address-level2" maxLength={100} className="mt-1 w-full" value={city} onChange={(e) => setCity(e.target.value)} />
            </label>
          )}
          <label className="text-sm">
            Password
            <input required minLength={join ? 8 : 1} maxLength={128} autoComplete={join ? 'new-password' : 'current-password'} type="password" className="mt-1 w-full" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {error && <div id="auth-error" role="alert" className="rounded-md bg-danger-surface px-3 py-3 text-sm text-danger">{error}</div>}
          {message && !error && <p role="status" className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p>}
          {search.get('error') === 'confirmation' && <p role="alert" className="text-sm text-red-700">That confirmation link is invalid or expired. Please request a new email.</p>}
          <button
            disabled={busy}
            className="btn btn-lg"
          >
            {busy ? 'Please wait…' : join ? 'Create account' : 'Sign in'}
          </button>
        </form>
        <p className="mt-4 text-sm text-muted-foreground">
          {join ? (
            <>Already have an account? <Link className="underline" href={`/login${next ? '?next=' + encodeURIComponent(next) : ''}`}>Sign in</Link></>
          ) : (
            <>New here? <Link className="underline" href={`/login?mode=join${next ? '&next=' + encodeURIComponent(next) : ''}`}>Create an account</Link></>
          )}
        </p>
        {!join && <Link href="/auth/forgot-password" className="mt-3 inline-block text-sm underline">Forgot password?</Link>}
      </div>
      <div className="self-start rounded-xl border border-line bg-tint p-7 text-sm text-muted-foreground md:mt-4 md:p-9">
        <p className="eyebrow mb-4">Welcome to TrueDeal</p>
        <h2 className="section-title text-foreground">One account. Both sides of the deal.</h2>
        <p className="mt-2">Create an account to get started. Sellers complete a separate verification review before listing an item.</p>
        <p className="mt-2">Sign in securely with your email and password.</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
