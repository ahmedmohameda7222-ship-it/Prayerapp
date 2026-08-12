"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  refreshSession: () => Promise<void>;
};

const fallbackAuth: AuthContextValue = {
  session: null,
  user: null,
  loading: false,
  refreshSession: async () => undefined,
};

const AuthContext = createContext<AuthContextValue>(fallbackAuth);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    const client = createClient();
    if (!client) {
      setSession(null);
      setLoading(false);
      return;
    }
    const { data } = await client.auth.getSession();
    setSession(data.session ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    const client = createClient();
    if (!client) {
      setLoading(false);
      return;
    }

    void refreshSession();
    const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, [refreshSession]);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user: session?.user ?? null,
    loading,
    refreshSession,
  }), [loading, refreshSession, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function usePublicAuth() {
  return useContext(AuthContext);
}
