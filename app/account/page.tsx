"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, BookHeart, ChevronRight, LogOut, Settings, Shield, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/layout/PageHeader";
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
      setError(t("phase1.authError"));
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount() {
    if (!session?.access_token || busy || !window.confirm(t("phase1.deleteConfirm"))) return;
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
      setError(t("phase1.authError"));
    } finally {
      setBusy(false);
    }
  }

  const accountLinks = [
    ["/azkar?tab=Favorites", t("phase1.savedAzkar"), BookHeart],
    ["/#prayer-times", t("phase1.manageReminders"), Bell],
    ["/settings", t("settings.title"), Settings],
    ["/privacy", t("phase1.privacy"), Shield],
  ] as const;

  return (
    <AppShell>
      <div className="account-screen">
        <PageHeader titleKey="phase1.account" backHref="/more" />
        <p className="account-subtitle">{t("phase1.accountSubtitle")}</p>

        {loading ? <div className="mt-5 h-28 animate-pulse rounded-[18px] bg-[var(--app-surface-soft)]" /> : null}

        {!loading && !user ? (
          <section className="mt-5 rounded-[18px] border border-[var(--app-divider)] bg-[var(--app-surface)] p-5">
            <p className="text-sm leading-6 text-[var(--app-text-secondary)]">{t("phase1.noAccountNeeded")}</p>
            <div className="mt-4 grid gap-2">
              <Link href="/account/sign-in" className="inline-flex min-h-12 items-center justify-center rounded-[14px] bg-[var(--app-brand)] px-4 text-sm font-bold text-white">{t("phase1.signIn")}</Link>
              <Link href="/account/register" className="inline-flex min-h-12 items-center justify-center rounded-[14px] border border-[var(--app-divider)] px-4 text-sm font-bold text-[var(--app-brand)]">{t("phase1.createAccount")}</Link>
            </div>
          </section>
        ) : null}

        {user ? (
          <div className="mt-5 grid gap-4">
            <section className="rounded-[18px] border border-[var(--app-divider)] bg-[var(--app-surface)] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--app-text-secondary)]">{t("phase1.signedInAs")}</p>
              <p className="mt-1 break-all font-semibold text-[var(--app-text)]">{user.email}</p>
            </section>

            <div className="account-actions">
              {accountLinks.map(([href, label, Icon]) => (
                <Link key={href} href={href} className="account-action-row">
                  <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                  <span className="min-w-0 flex-1">{label}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-[var(--app-text-secondary)] rtl:rotate-180" aria-hidden="true" />
                </Link>
              ))}
            </div>

            {error ? <p role="alert" className="rounded-[14px] bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p> : null}

            <Button disabled={busy} variant="ghost" onClick={() => void signOut()}>
              <LogOut className="h-4 w-4" aria-hidden="true" />
              {t("phase1.signOut")}
            </Button>

            <div className="border-t border-[var(--app-divider)] pt-4">
              <Button disabled={busy} variant="ghost" className="w-full border-red-200 text-red-800" onClick={() => void deleteAccount()}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                {t("phase1.deleteAccount")}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
