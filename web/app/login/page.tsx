'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import DemoAccounts from '@/components/DemoAccounts';
import { api, ApiError } from '@/lib/client';
import { useSession } from '@/lib/session-context';
import type { User } from '@/lib/types';

function LoginInner() {
  const search = useSearchParams();
  const router = useRouter();
  const { refresh } = useSession();
  const join = search.get('mode') === 'join';
  const next = search.get('next') || '';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

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
        await api.post<{ user: User }>('/api/auth/signup', { name, email, city });
      } else {
        await api.post<{ user: User }>('/api/auth/signin', { email });
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
        <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
          {join && (
            <label className="text-sm">
              Full name
              <input className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
          )}
          <label className="text-sm">
            Email
            <input type="email" className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2" value={email} onChange={(e) => setEmail(e.target.value)} />
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
          <button disabled={busy} className="rounded-full bg-neutral-900 py-2.5 text-sm font-medium text-white disabled:opacity-50">
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
      </div>
      <DemoAccounts next={next || undefined} />
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
