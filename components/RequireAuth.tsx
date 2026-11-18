'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useSession } from '@/lib/session-context';

export default function RequireAuth({
  role,
  children,
}: {
  role?: 'ops';
  children: React.ReactNode;
}) {
  const { user, loading, error } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (loading || error) return;
    if (!user) {
      router.replace('/login?next=' + encodeURIComponent(window.location.pathname));
      return;
    }
    if (role && user.role !== role) router.replace('/');
  }, [loading, user, role, router, error]);

  if(error) return <p role="alert" className="mx-auto max-w-lg px-4 py-12 text-sm text-red-700">{error}</p>;

  if (loading || !user || (role && user.role !== role)) {
    return <div className="mx-auto max-w-6xl px-4 py-16 text-center text-neutral-400">Loading…</div>;
  }
  return <>{children}</>;
}
