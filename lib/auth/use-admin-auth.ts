"use client";

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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

const initialState: AdminAuthState = {
  user: null,
  session: null,
  isAdmin: false,
  loading: true,
  error: null,
};

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const {
    session: publicSession,
    user: publicUser,
    loading: publicLoading,
  } = usePublicAuth();
  const [state, setState] = useState<AdminAuthState>(initialState);
  const verifiedTokenRef = useRef<string | null>(null);
  const verificationIdRef = useRef(0);
  const signInInFlightRef = useRef(false);

  useEffect(() => {
    if (publicLoading) {
      setState((current) => ({
        ...current,
        user: publicUser,
        session: publicSession,
        loading: true,
      }));
      return;
    }

    const token = publicSession?.access_token ?? null;
    if (!token) {
      verifiedTokenRef.current = null;
      verificationIdRef.current += 1;
      if (!signInInFlightRef.current) {
        setState({ ...initialState, loading: false });
      }
      return;
    }

    if (signInInFlightRef.current) {
      setState((current) => ({
        ...current,
        user: publicUser,
        session: publicSession,
        loading: true,
      }));
      return;
    }

    if (verifiedTokenRef.current === token) {
      setState((current) => ({
        ...current,
        user: publicUser,
        session: publicSession,
        loading: false,
      }));
      return;
    }

    const verificationId = ++verificationIdRef.current;
    setState((current) => ({
      ...current,
      user: publicUser,
      session: publicSession,
      loading: true,
      error: null,
    }));

    void verifyAdminAction(token)
      .then((verification) => {
        if (verificationIdRef.current !== verificationId) return;
        verifiedTokenRef.current = token;
        setState({
          user: publicUser,
          session: publicSession,
          isAdmin: verification.allowed,
          loading: false,
          error: null,
        });
      })
      .catch(() => {
        if (verificationIdRef.current !== verificationId) return;
        verifiedTokenRef.current = token;
        setState({
          user: publicUser,
          session: publicSession,
          isAdmin: false,
          loading: false,
          error: null,
        });
      });
  }, [publicLoading, publicSession, publicUser]);

  const signOut = useCallback(async () => {
    verificationIdRef.current += 1;
    verifiedTokenRef.current = null;
    signInInFlightRef.current = false;

    const client = createClient();
    if (client) {
      await client.auth.signOut();
    }

    setState({ ...initialState, loading: false });
    router.push("/admin/login");
  }, [router]);

  const signIn = useCallback(async (email: string, password: string) => {
    const client = createClient();
    if (!client) {
      setState((current) => ({
        ...current,
        loading: false,
        error: "admin.errors.supabaseNotConfigured",
      }));
      return false;
    }

    signInInFlightRef.current = true;
    setState((current) => ({ ...current, loading: true, error: null }));

    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error || !data.session) {
      signInInFlightRef.current = false;
      setState((current) => ({
        ...current,
        isAdmin: false,
        loading: false,
        error: "admin.errors.invalidCredentials",
      }));
      return false;
    }

    const establishment = await establishAdminSessionAction(data.session.access_token);
    signInInFlightRef.current = false;

    if (!establishment.allowed) {
      await client.auth.signOut();
      verifiedTokenRef.current = null;
      setState({
        user: null,
        session: null,
        isAdmin: false,
        loading: false,
        error: "admin.errors.unauthorized",
      });
      return false;
    }

    verificationIdRef.current += 1;
    verifiedTokenRef.current = data.session.access_token;
    setState({
      user: data.user,
      session: data.session,
      isAdmin: true,
      loading: false,
      error: null,
    });
    return true;
  }, []);

  const refresh = useCallback(async () => {
    const session = state.session ?? publicSession;
    if (!session) {
      verifiedTokenRef.current = null;
      setState({ ...initialState, loading: false });
      return;
    }

    const token = session.access_token;
    const verificationId = ++verificationIdRef.current;
    setState((current) => ({ ...current, loading: true, error: null }));

    try {
      const verification = await verifyAdminAction(token);
      if (verificationIdRef.current !== verificationId) return;
      verifiedTokenRef.current = token;
      setState({
        user: session.user,
        session,
        isAdmin: verification.allowed,
        loading: false,
        error: null,
      });
    } catch {
      if (verificationIdRef.current !== verificationId) return;
      verifiedTokenRef.current = token;
      setState({
        user: session.user,
        session,
        isAdmin: false,
        loading: false,
        error: null,
      });
    }
  }, [publicSession, state.session]);

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
