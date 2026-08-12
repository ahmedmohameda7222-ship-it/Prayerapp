"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, BookHeart, LogOut, Settings, Shield, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { usePublicAuth } from "@/components/providers/AuthProvider";
import { useAppPreferences } from "@/components/providers/AppPreferencesProvider";
import { createClient } from "@/lib/supabase/client";
import { useTranslation } from "@/lib/i18n/use-translation";

export default function AccountPage() {
  const { t } = useTranslation();
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
      setError(t("account.authError"));
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount() {
    if (!session?.access_token || busy || !window.confirm(t("account.deleteConfirm"))) return;
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
      setError(t("account.authError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <section className="mx-auto max-w-xl py-5">
        <h1 className="font-brand text-3xl font-semibold text-[var(--color-emerald)]">{t("account.title")}</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">{t("account.subtitle")}</p>

        {loading ? <div className="mt-5 h-28 animate-pulse rounded-[24px] bg-[var(--color-cream-deep)]" /> : null}

        {!loading && !user ? (
          <div className="mt-5 grid gap-3 rounded-[24px] border border-[var(--color-border)] bg-[var(--color-card)] p-5">
            <p className="text-sm text-[var(--color-muted)]">{t("account.guestAvailable")}</p>
            <Link href="/account/sign-in" className="inline-flex min-h-11 items-center justify-center rounded-[14px] bg-[var(--color-emerald)] px-4 text-sm font-bold text-[var(--color-card)]">{t("account.signIn")}</Link>
            <Link href="/account/register" className="inline-flex min-h-11 items-center justify-center rounded-[14px] border border-[var(--color-border)] px-4 text-sm font-bold text-[var(--color-emerald)]">{t("account.createAccount")}</Link>
          </div>
        ) : null}

        {user ? (
          <div className="mt-5 grid gap-4">
            <div className="rounded-[24px] border border-[var(--color-border)] bg-[var(--color-card)] p-5">
              <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-[var(--color-gold-dark)]">{t("account.signedInAs")}</p>
              <p className="mt-1 break-all font-bold text-[var(--color-charcoal)]">{user.email}</p>
            </div>
            <Link href="/azkar?tab=Favorites" className="card flex min-h-16 items-center gap-3 p-4 font-bold text-[var(--color-emerald)]">
              <BookHeart className="h-5 w-5 text-[var(--color-gold-dark)]" aria-hidden="true" />
              {t("account.savedAzkar")}
            </Link>
            <Link href="/#prayer-times" className="card flex min-h-16 items-center gap-3 p-4 font-bold text-[var(--color-emerald)]">
              <Bell className="h-5 w-5 text-[var(--color-gold-dark)]" aria-hidden="true" />
              {t("account.manageReminders")}
            </Link>
            <Link href="/settings" className="card flex min-h-16 items-center gap-3 p-4 font-bold text-[var(--color-emerald)]">
              <Settings className="h-5 w-5 text-[var(--color-gold-dark)]" aria-hidden="true" />
              {t("settings.title")}
            </Link>
            <Link href="/privacy" className="card flex min-h-16 items-center gap-3 p-4 font-bold text-[var(--color-emerald)]">
              <Shield className="h-5 w-5 text-[var(--color-gold-dark)]" aria-hidden="true" />
              {t("account.privacy")}
            </Link>
            {error ? <p role="alert" className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-800">{error}</p> : null}
            <Button disabled={busy} variant="ghost" onClick={() => void signOut()}>
              <LogOut className="h-4 w-4" aria-hidden="true" />
              {t("account.signOut")}
            </Button>
            <Button disabled={busy} variant="ghost" className="border-red-200 text-red-800" onClick={() => void deleteAccount()}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              {t("account.deleteAccount")}
            </Button>
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}
