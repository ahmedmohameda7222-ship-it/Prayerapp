"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { usePublicAuth } from "@/components/providers/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { normalizeReturnPath } from "@/lib/auth/return-url";
import { useTranslation } from "@/lib/i18n/use-translation";

type Mode = "sign-in" | "register" | "forgot" | "reset";

export function AuthForm({ mode }: { mode: Mode }) {
  const { t } = useTranslation();
  const { user } = usePublicAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = useMemo(() => normalizeReturnPath(params.get("next"), "/account"), [params]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (user && mode === "sign-in") {
      router.replace(next);
      router.refresh();
    }
  }, [mode, next, router, user]);

  const title = mode === "sign-in"
    ? t("phase1.signIn")
    : mode === "register"
      ? t("phase1.createAccount")
      : t("phase1.resetPassword");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const client = createClient();
    if (!client) {
      setError(t("phase1.authError"));
      setBusy(false);
      return;
    }

    try {
      if (mode === "sign-in") {
        const { error: authError } = await client.auth.signInWithPassword({ email, password });
        if (authError) throw authError;
        router.replace(next);
        router.refresh();
      } else if (mode === "register") {
        const redirectTo = `${window.location.origin}/account/sign-in?next=${encodeURIComponent(next)}`;
        const { data, error: authError } = await client.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectTo },
        });
        if (authError) throw authError;
        if (data.session) {
          router.replace(next);
          router.refresh();
        } else {
          setMessage(t("phase1.checkEmail"));
        }
      } else if (mode === "forgot") {
        const redirectTo = `${window.location.origin}/account/reset-password?next=${encodeURIComponent(next)}`;
        const { error: authError } = await client.auth.resetPasswordForEmail(email, { redirectTo });
        if (authError) throw authError;
        setMessage(t("phase1.checkEmail"));
      } else {
        const { error: authError } = await client.auth.updateUser({ password });
        if (authError) throw authError;
        router.replace(next);
        router.refresh();
      }
    } catch {
      setError(t("phase1.authError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-screen">
      <Link href="/account" aria-label={t("phase1.account")} className="mb-4 grid h-11 w-11 place-items-center rounded-full text-[var(--app-brand)]">
        <ChevronLeft className="h-5 w-5 rtl:rotate-180" aria-hidden="true" />
      </Link>
      <section className="auth-surface px-0 py-2 sm:px-2">
        <h1>{title}</h1>
        <p className="mt-2 text-sm leading-6">{t("phase1.accountSubtitle")}</p>
        <form onSubmit={submit} className="mt-6 grid gap-4">
          {mode !== "reset" ? (
            <label className="grid gap-1.5 text-sm font-semibold text-[var(--app-text)]">
              {t("phase1.email")}
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="border border-[var(--app-divider)] px-4 text-[var(--app-text)] outline-none focus:border-[var(--app-brand)]"
              />
            </label>
          ) : null}
          {mode !== "forgot" ? (
            <label className="grid gap-1.5 text-sm font-semibold text-[var(--app-text)]">
              {mode === "reset" ? t("phase1.newPassword") : t("phase1.password")}
              <input
                type="password"
                autoComplete={mode === "register" || mode === "reset" ? "new-password" : "current-password"}
                minLength={8}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="border border-[var(--app-divider)] px-4 text-[var(--app-text)] outline-none focus:border-[var(--app-brand)]"
              />
            </label>
          ) : null}
          {error ? <p role="alert" className="rounded-[14px] bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p> : null}
          {message ? <p role="status" className="rounded-[14px] bg-[var(--app-brand-soft)] p-3 text-sm font-semibold text-[var(--app-brand-strong)]">{message}</p> : null}
          <Button type="submit" disabled={busy} className="min-h-12 w-full">
            {mode === "forgot" ? t("phase1.sendReset") : title}
          </Button>
        </form>
        <div className="mt-6 grid gap-3 text-center text-sm font-semibold text-[var(--app-brand)]">
          {mode === "sign-in" ? (
            <>
              <Link href={`/account/register?next=${encodeURIComponent(next)}`}>{t("phase1.createAccount")}</Link>
              <Link href={`/account/forgot-password?next=${encodeURIComponent(next)}`}>{t("phase1.forgotPassword")}</Link>
            </>
          ) : null}
          {mode === "register" || mode === "forgot" ? (
            <Link href={`/account/sign-in?next=${encodeURIComponent(next)}`}>{t("phase1.signIn")}</Link>
          ) : null}
        </div>
      </section>
    </div>
  );
}
