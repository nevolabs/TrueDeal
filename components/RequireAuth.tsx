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
  const { user, loading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login?next=' + encodeURIComponent(window.location.pathname));
      return;
    }
    if (role && user.role !== role) router.replace('/');
  }, [loading, user, role, router]);

  if (loading || !user || (role && user.role !== role)) {
    return <div className="mx-auto max-w-6xl px-4 py-16 text-center text-neutral-400">Loading…</div>;
  }
  return <>{children}</>;
}
