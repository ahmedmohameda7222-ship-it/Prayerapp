"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookHeart, LogOut, Shield, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { usePublicAuth } from "@/components/providers/AuthProvider";
import { useAppPreferences } from "@/components/providers/AppPreferencesProvider";
import { createClient } from "@/lib/supabase/client";
import { phase1Copy } from "@/lib/i18n/phase1-copy";
import { useTranslation } from "@/lib/i18n/use-translation";

export default function AccountPage() {
  const { locale } = useTranslation();
  const copy = phase1Copy[locale];
  const { session, user, loading } = usePublicAuth();
  const { detachAccount } = useAppPreferences();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function signOut() {
    if (busy) return;
    setBusy(true);
    setError("");

    try {
      await detachAccount();
    } catch (detachError) {
      console.warn("Push account detachment failed during sign-out", detachError);
    }

    try {
      const client = createClient();
      if (!client) throw new Error("Auth client unavailable");
      const { error: signOutError } = await client.auth.signOut();
      if (signOutError) throw signOutError;
      router.replace("/");
      router.refresh();
    } catch {
      setError(copy.authError);
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount() {
    if (!session?.access_token || busy || !window.confirm(copy.deleteConfirm)) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/account/delete", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!response.ok) throw new Error("Delete failed");
      const client = createClient();
      await client?.auth.signOut({ scope: "local" });
      router.replace("/");
      router.refresh();
    } catch {
      setError(copy.authError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <section className="mx-auto max-w-xl py-5">
        <h1 className="font-brand text-3xl font-semibold text-[var(--color-emerald)]">{copy.account}</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">{copy.accountSubtitle}</p>

        {loading ? <div className="mt-5 h-28 animate-pulse rounded-[24px] bg-[var(--color-cream-deep)]" /> : null}

        {!loading && !user ? (
          <div className="mt-5 grid gap-3 rounded-[24px] border border-[var(--color-border)] bg-[var(--color-card)] p-5">
            <p className="text-sm text-[var(--color-muted)]">{copy.noAccountNeeded}</p>
            <Link href="/account/sign-in" className="inline-flex min-h-11 items-center justify-center rounded-[14px] bg-[var(--color-emerald)] px-4 text-sm font-bold text-[var(--color-card)]">{copy.signIn}</Link>
            <Link href="/account/register" className="inline-flex min-h-11 items-center justify-center rounded-[14px] border border-[var(--color-border)] px-4 text-sm font-bold text-[var(--color-emerald)]">{copy.createAccount}</Link>
          </div>
        ) : null}

        {user ? (
          <div className="mt-5 grid gap-4">
            <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-card)] p-5">
              <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-[var(--color-gold-dark)]">{copy.signedInAs}</p>
              <p className="mt-1 break-all font-bold text-[var(--color-charcoal)]">{user.email}</p>
            </div>
            <Link href="/azkar?tab=Favorites" className="card flex min-h-16 items-center gap-3 p-4 font-bold text-[var(--color-emerald)]">
              <BookHeart className="h-5 w-5 text-[var(--color-gold-dark)]" aria-hidden="true" />
              {copy.savedAzkar}
            </Link>
            <Link href="/privacy" className="card flex min-h-16 items-center gap-3 p-4 font-bold text-[var(--color-emerald)]">
              <Shield className="h-5 w-5 text-[var(--color-gold-dark)]" aria-hidden="true" />
              {copy.privacy}
            </Link>
            {error ? <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-800">{error}</p> : null}
            <Button disabled={busy} variant="ghost" onClick={() => void signOut()}>
              <LogOut className="h-4 w-4" aria-hidden="true" />
              {copy.signOut}
            </Button>
            <Button disabled={busy} variant="ghost" className="border-red-200 text-red-800" onClick={() => void deleteAccount()}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              {copy.deleteAccount}
            </Button>
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}
