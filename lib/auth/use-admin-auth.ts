"use client";

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { Session, User } from "@supabase/supabase-js";
import { usePublicAuth } from "@/components/providers/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { establishAdminSessionAction, verifyAdminAction } from "./admin-actions";

export type AdminAuthState = {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
};

type AdminAuthContextValue = AdminAuthState & {
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

type VerificationState = {
  token: string;
  allowed: boolean;
};

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const {
    session: publicSession,
    user: publicUser,
    loading: publicLoading,
  } = usePublicAuth();
  const [verification, setVerification] = useState<VerificationState | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [signInPending, setSignInPending] = useState(false);
  const [refreshPending, setRefreshPending] = useState(false);
  const token = publicSession?.access_token ?? null;

  useEffect(() => {
    if (
      publicLoading ||
      signInPending ||
      !token ||
      verification?.token === token
    ) {
      return;
    }

    let cancelled = false;
    void verifyAdminAction(token)
      .then((result) => {
        if (!cancelled) {
          setVerification({ token, allowed: result.allowed });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setVerification({ token, allowed: false });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [publicLoading, signInPending, token, verification?.token]);

  const signOut = useCallback(async () => {
    const client = createClient();
    if (client) {
      await client.auth.signOut();
    }

    setVerification(null);
    setActionError(null);
    setSignInPending(false);
    setRefreshPending(false);
    router.push("/admin/login");
  }, [router]);

  const signIn = useCallback(async (email: string, password: string) => {
    const client = createClient();
    if (!client) {
      setActionError("admin.errors.supabaseNotConfigured");
      return false;
    }

    setSignInPending(true);
    setActionError(null);

    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error || !data.session) {
      setSignInPending(false);
      setActionError("admin.errors.invalidCredentials");
      return false;
    }

    const establishment = await establishAdminSessionAction(data.session.access_token);
    if (!establishment.allowed) {
      await client.auth.signOut();
      setVerification(null);
      setSignInPending(false);
      setActionError("admin.errors.unauthorized");
      return false;
    }

    setVerification({ token: data.session.access_token, allowed: true });
    setSignInPending(false);
    setActionError(null);
    return true;
  }, []);

  const refresh = useCallback(async () => {
    if (!token) {
      setVerification(null);
      setActionError(null);
      return;
    }

    setRefreshPending(true);
    setActionError(null);
    try {
      const result = await verifyAdminAction(token);
      setVerification({ token, allowed: result.allowed });
    } catch {
      setVerification({ token, allowed: false });
    } finally {
      setRefreshPending(false);
    }
  }, [token]);

  const tokenVerified = Boolean(token && verification?.token === token);
  const state = useMemo<AdminAuthState>(() => ({
    user: token ? publicUser : null,
    session: token ? publicSession : null,
    isAdmin: tokenVerified && verification?.allowed === true,
    loading:
      publicLoading ||
      signInPending ||
      refreshPending ||
      Boolean(token && !tokenVerified),
    error: actionError,
  }), [
    actionError,
    publicLoading,
    publicSession,
    publicUser,
    refreshPending,
    signInPending,
    token,
    tokenVerified,
    verification?.allowed,
  ]);

  const value = useMemo<AdminAuthContextValue>(
    () => ({ ...state, signIn, signOut, refresh }),
    [refresh, signIn, signOut, state],
  );

  return createElement(AdminAuthContext.Provider, { value }, children);
}

export function useAdminAuth() {
  const value = useContext(AdminAuthContext);
  if (!value) {
    throw new Error("useAdminAuth must be used within AdminAuthProvider");
  }
  return value;
}
