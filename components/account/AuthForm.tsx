"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
    ? t("account.signIn")
    : mode === "register"
      ? t("account.createAccount")
      : t("account.resetPassword");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const client = createClient();
    if (!client) {
      setError(t("account.authError"));
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
          setMessage(t("account.checkEmail"));
        }
      } else if (mode === "forgot") {
        const redirectTo = `${window.location.origin}/account/reset-password?next=${encodeURIComponent(next)}`;
        const { error: authError } = await client.auth.resetPasswordForEmail(email, { redirectTo });
        if (authError) throw authError;
        setMessage(t("account.checkEmail"));
      } else {
        const { error: authError } = await client.auth.updateUser({ password });
        if (authError) throw authError;
        router.replace(next);
        router.refresh();
      }
    } catch {
      setError(t("account.authError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto max-w-md rounded-[24px] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)] sm:p-6">
      <h1 className="font-brand text-2xl font-semibold text-[var(--color-emerald)]">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">{t("account.subtitle")}</p>
      <form onSubmit={submit} className="mt-5 grid gap-4">
        {mode !== "reset" ? (
          <label className="grid gap-1.5 text-sm font-bold text-[var(--color-emerald)]">
            {t("account.email")}
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="min-h-12 rounded-2xl border border-[var(--color-border)] bg-[var(--color-cream)] px-4 text-[var(--color-charcoal)] outline-none focus:border-[var(--color-gold-dark)]"
            />
          </label>
        ) : null}
        {mode !== "forgot" ? (
          <label className="grid gap-1.5 text-sm font-bold text-[var(--color-emerald)]">
            {mode === "reset" ? t("account.newPassword") : t("account.password")}
            <input
              type="password"
              autoComplete={mode === "register" || mode === "reset" ? "new-password" : "current-password"}
              minLength={8}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="min-h-12 rounded-2xl border border-[var(--color-border)] bg-[var(--color-cream)] px-4 text-[var(--color-charcoal)] outline-none focus:border-[var(--color-gold-dark)]"
            />
          </label>
        ) : null}
        {error ? <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-800">{error}</p> : null}
        {message ? <p role="status" className="rounded-2xl bg-[var(--color-emerald-soft)] p-3 text-sm font-bold text-[var(--color-emerald)]">{message}</p> : null}
        <Button type="submit" disabled={busy} className="w-full">
          {mode === "forgot" ? t("account.sendReset") : title}
        </Button>
      </form>
      <div className="mt-5 grid gap-2 text-center text-sm font-bold text-[var(--color-emerald)]">
        {mode === "sign-in" ? (
          <>
            <Link href={`/account/register?next=${encodeURIComponent(next)}`}>{t("account.createAccount")}</Link>
            <Link href={`/account/forgot-password?next=${encodeURIComponent(next)}`}>{t("account.forgotPassword")}</Link>
          </>
        ) : null}
        {mode === "register" || mode === "forgot" ? (
          <Link href={`/account/sign-in?next=${encodeURIComponent(next)}`}>{t("account.signIn")}</Link>
        ) : null}
        <Link href="/">Masjid El-Rahman</Link>
      </div>
    </section>
  );
}
