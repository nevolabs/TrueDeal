'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from './client';
import type { User } from './types';

interface SessionCtx {
  user: User | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  error: string;
}

const Ctx = createContext<SessionCtx | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  const refresh = useCallback(async () => {
    const data = await api.get<{ user: User | null }>('/api/session');
    setUser(data.user);
    setError('');
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial session fetch on mount
    refresh().catch((e: Error) => setError(e.message)).finally(() => setLoading(false));
  }, [refresh]);

  const signOut = useCallback(async () => {
    await api.del('/api/session');
    setUser(null);
    router.refresh();
  }, [router]);

  const value = useMemo(
    () => ({ user, loading, refresh, signOut, error }),
    [user, loading, refresh, signOut, error]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}
