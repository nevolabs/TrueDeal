'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useSession } from '@/lib/session-context';
import { useToast } from '@/lib/toast-context';

export default function Header() {
  const { user, loading, signOut } = useSession();
  const toast = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          sell.io
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-neutral-600 md:flex">
          <Link href="/browse" className="hover:text-neutral-900">
            Browse
          </Link>
          <Link href="/protection" className="hover:text-neutral-900">
            How it works
          </Link>
          <Link href="/sell" className="hover:text-neutral-900">
            Sell
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          {!loading && user && (
            <>
              {user.role === 'ops' ? (
                <Link href="/ops" className="text-sm font-medium hover:underline">
                  Bench console
                </Link>
              ) : (
                <>
                  <Link href="/selling" className="hidden text-sm hover:underline sm:inline">
                    Selling
                  </Link>
                  <Link href="/orders" className="hidden text-sm hover:underline sm:inline">
                    Orders
                  </Link>
                </>
              )}
              <div className="relative">
                <button
                  onClick={() => setOpen((v) => !v)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900 text-xs font-medium text-white"
                  title={user.name}
                >
                  {user.name
                    .split(' ')
                    .slice(0, 2)
                    .map((p) => p[0])
                    .join('')}
                </button>
                {open && (
                  <div className="absolute right-0 mt-2 w-56 rounded-lg border border-neutral-200 bg-white p-2 shadow-lg">
                    <div className="px-2 py-1.5 text-sm font-medium">{user.name}</div>
                    <div className="px-2 pb-2 text-xs text-neutral-500">{user.email}</div>
                    <button
                      onClick={async () => {
                        setOpen(false);
                        await signOut();
                        toast('Signed out.');
                        router.push('/');
                      }}
                      className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-neutral-50"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
          {!loading && !user && (
            <Link
              href="/login"
              className="rounded-full bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-neutral-700"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
