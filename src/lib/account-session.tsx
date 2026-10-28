import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';

const AccountContext = createContext<{ user: User | null; loading: boolean; refresh: () => Promise<void> }>({ user: null, loading: true, refresh: async () => {} });
export function AccountProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();
  const router = useRouter();
  async function refresh() {
    const { data } = await supabase.auth.getUser();
    setUser(data.user);
    setLoading(false);
  }
  useEffect(() => {
    let active = true;
    let generation = 0;
    async function loadIdentity() {
      const version = ++generation;
      const { data } = await supabase.auth.getUser();
      if (active && version === generation) { setUser(data.user); setLoading(false); }
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (!['SIGNED_IN', 'SIGNED_OUT', 'USER_UPDATED', 'PASSWORD_RECOVERY'].includes(event)) return;
      if (event === 'SIGNED_OUT') { generation++; setUser(null); setLoading(false); }
      queueMicrotask(() => {
        if (!active) return;
        if (event !== 'SIGNED_OUT') { void loadIdentity(); void queryClient.invalidateQueries(); }
        void router.invalidate();
      });
    });
    void loadIdentity();
    return () => { active = false; subscription.unsubscribe(); };
  }, [queryClient, router]);
  return <AccountContext.Provider value={{ user, loading, refresh }}>{children}</AccountContext.Provider>;
}
export const useAccount = () => useContext(AccountContext);