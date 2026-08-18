"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, LogIn, Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAdminAuth } from "@/lib/auth/use-admin-auth";
import { useTranslation } from "@/lib/i18n/use-translation";
import { APP_NAMES } from "@/lib/app-brand";

export default function AdminLoginPage() {
  const router = useRouter();
  const { signIn, isAdmin, loading: authLoading } = useAdminAuth();
  const { t, locale } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [hasSupabase] = useState(() => !!createClient());

  useEffect(() => {
    if (isAdmin) router.push("/admin");
  }, [isAdmin, router]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    const ok = await signIn(email, password);
    setSubmitting(false);
    if (!ok) setError(t("admin.errors.invalidCredentials"));
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#f7f3ea] p-4 [padding-top:max(16px,env(safe-area-inset-top))] [padding-bottom:max(16px,env(safe-area-inset-bottom))]">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-[var(--color-emerald-soft)] text-[var(--color-emerald)]">
            <Shield className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-semibold text-[var(--color-charcoal)]">{APP_NAMES[locale]}</h1>
          <p className="mt-1 text-sm font-medium text-[var(--color-muted)]">{t("admin.mosqueAdministration")}</p>
        </div>

        {!hasSupabase ? (
          <div className="mb-4 rounded-[14px] border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/8 p-4 text-sm text-[var(--color-warning)]">
            <div className="mb-1.5 flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              {t("admin.setupRequired")}
            </div>
            <p>{t("admin.supabaseEnvMissing")}</p>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="rounded-[18px] border border-[#e4ddd2] bg-[#fffdf8] p-5 shadow-none sm:p-6">
          <h2 className="mb-5 text-xl font-semibold text-[var(--color-charcoal)]">{t("admin.signIn")}</h2>
          <div className="grid gap-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-[var(--color-charcoal)]">{t("admin.email")}</label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="min-h-12 w-full rounded-[12px] border border-[#e4ddd2] bg-white px-4 text-sm text-[var(--color-charcoal)] outline-none focus:border-[var(--color-emerald)]"
                placeholder="admin@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-[var(--color-charcoal)]">{t("admin.password")}</label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="min-h-12 w-full rounded-[12px] border border-[#e4ddd2] bg-white px-4 text-sm text-[var(--color-charcoal)] outline-none focus:border-[var(--color-emerald)]"
                placeholder="••••••••"
              />
            </div>
            {error ? <p role="alert" className="rounded-[12px] bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p> : null}
            <button
              type="submit"
              disabled={submitting || authLoading}
              className="flex min-h-12 items-center justify-center gap-2 rounded-[12px] bg-[var(--color-emerald)] text-sm font-semibold text-white active:scale-[0.99] disabled:opacity-50"
            >
              <LogIn className="h-4 w-4" aria-hidden="true" />
              {submitting ? t("admin.signingIn") : t("admin.signIn")}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
