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
    <div className="mx-auto grid max-w-4xl gap-10 px-4 py-10 md:grid-cols-2">
      <div>
        <h1 className="text-2xl font-semibold">{join ? 'Create your account' : 'Sign in'}</h1>
        <p className="mt-1 text-sm text-neutral-500">{join ? 'One account lets you buy and sell.' : 'Welcome back.'}</p>
        {next.startsWith('/checkout') && (
          <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Sign in to continue to checkout.
          </p>
        )}
        <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
          {join && (
            <label className="text-sm">
              Full name
              <input className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
          )}
          <label className="text-sm">
            Email
            <input
              type="email"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          {join && (
            <label className="text-sm">
              City
              <input className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2" value={city} onChange={(e) => setCity(e.target.value)} />
            </label>
          )}
          <label className="text-sm">
            Password
            <input type="password" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          {message && <p role="status" className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p>}
          {search.get('error') === 'confirmation' && <p role="alert" className="text-sm text-red-700">That confirmation link is invalid or expired. Please request a new email.</p>}
          <button
            disabled={busy}
            className="rounded-full bg-neutral-900 py-2.5 text-sm font-medium text-white hover:bg-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 disabled:opacity-50"
          >
            {join ? 'Create account' : 'Sign in'}
          </button>
        </form>
        <p className="mt-4 text-sm text-neutral-500">
          {join ? (
            <>Already have an account? <Link className="underline" href={`/login${next ? '?next=' + encodeURIComponent(next) : ''}`}>Sign in</Link></>
          ) : (
            <>New here? <Link className="underline" href={`/login?mode=join${next ? '&next=' + encodeURIComponent(next) : ''}`}>Create an account</Link></>
          )}
        </p>
        {!join && <Link href="/auth/forgot-password" className="mt-3 inline-block text-sm underline">Forgot password?</Link>}
      </div>
      <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-5 text-sm text-neutral-600">
        <h2 className="font-semibold text-neutral-900">One account for buying and selling</h2>
        <p className="mt-2">Confirm your email to get started. Sellers complete a separate verification review before listing an item.</p>
        <p className="mt-2">Your password is managed securely by Supabase Auth.</p>
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
