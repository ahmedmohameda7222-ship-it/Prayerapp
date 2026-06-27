"use client";

import { useEffect, useReducer, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { verifyAdminAction } from "./admin-actions";
import type { User, Session } from "@supabase/supabase-js";

export type AdminAuthState = {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  loading: boolean;
  error: string | null;
};

type Action =
  | { type: "SET_SESSION"; user: User | null; session: Session | null; isAdmin: boolean }
  | { type: "SET_ERROR"; error: string }
  | { type: "SET_LOADING"; loading: boolean }
  | { type: "RESET" };

const initialState: AdminAuthState = {
  user: null,
  session: null,
  isAdmin: false,
  loading: true,
  error: null,
};

function reducer(state: AdminAuthState, action: Action): AdminAuthState {
  switch (action.type) {
    case "SET_SESSION":
      return { ...state, user: action.user, session: action.session, isAdmin: action.isAdmin, loading: false, error: null };
    case "SET_ERROR":
      return { ...state, error: action.error, loading: false };
    case "SET_LOADING":
      return { ...state, loading: action.loading };
    case "RESET":
      return { user: null, session: null, isAdmin: false, loading: false, error: null };
  }
}

export function useAdminAuth() {
  const router = useRouter();
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      const client = createClient();
      if (!client) {
        if (!cancelled) dispatch({ type: "SET_LOADING", loading: false });
        return;
      }
      const { data, error } = await client.auth.getSession();
      if (cancelled) return;
      if (error || !data.session) {
        dispatch({ type: "SET_LOADING", loading: false });
        return;
      }
      const verification = await verifyAdminAction(data.session.access_token);
      const allowed = verification.allowed;
      dispatch({ type: "SET_SESSION", user: data.session.user, session: data.session, isAdmin: allowed });
    }
    init();
    return () => { cancelled = true; };
  }, []);

  const signOut = useCallback(async () => {
    const client = createClient();
    if (client) {
      await client.auth.signOut();
    }
    dispatch({ type: "RESET" });
    router.push("/admin/login");
  }, [router]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const client = createClient();
      if (!client) {
        dispatch({ type: "SET_ERROR", error: "admin.errors.supabaseNotConfigured" });
        return false;
      }
      dispatch({ type: "SET_LOADING", loading: true });
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error || !data.session) {
        dispatch({ type: "SET_ERROR", error: "admin.errors.invalidCredentials" });
        return false;
      }
      const verification = await verifyAdminAction(data.session.access_token);
      const allowed = verification.allowed;
      if (!allowed) {
        await client.auth.signOut();
        dispatch({ type: "SET_ERROR", error: "admin.errors.unauthorized" });
        return false;
      }
      dispatch({ type: "SET_SESSION", user: data.user, session: data.session, isAdmin: true });
      return true;
    },
    []
  );

  const refresh = useCallback(async () => {
    const client = createClient();
    if (!client) {
      dispatch({ type: "SET_LOADING", loading: false });
      return;
    }
    const { data, error } = await client.auth.getSession();
    if (error || !data.session) {
      dispatch({ type: "SET_LOADING", loading: false });
      return;
    }
    const verification = await verifyAdminAction(data.session.access_token);
    const allowed = verification.allowed;
    dispatch({ type: "SET_SESSION", user: data.session.user, session: data.session, isAdmin: allowed });
  }, []);

  return { ...state, signIn, signOut, refresh };
}
