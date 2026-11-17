'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from './client';
import type { User } from './types';

interface SessionCtx {
  user: User | null;
  loading: boolean;
  refresh: () => Promise<void>;
  switchTo: (userId: string) => Promise<User>;
  signOut: () => Promise<void>;
  resetData: () => Promise<void>;
}

const Ctx = createContext<SessionCtx | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refresh = useCallback(async () => {
    const data = await api.get<{ user: User | null }>('/api/session');
    setUser(data.user);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial session fetch on mount
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const switchTo = useCallback(
    async (userId: string) => {
      const data = await api.post<{ user: User }>('/api/session', { userId });
      setUser(data.user);
      router.refresh();
      return data.user;
    },
    [router]
  );

  const signOut = useCallback(async () => {
    await api.del('/api/session');
    setUser(null);
    router.refresh();
  }, [router]);

  const resetData = useCallback(async () => {
    await api.post('/api/reset');
    setUser(null);
    router.refresh();
  }, [router]);

  const value = useMemo(
    () => ({ user, loading, refresh, switchTo, signOut, resetData }),
    [user, loading, refresh, switchTo, signOut, resetData]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}
