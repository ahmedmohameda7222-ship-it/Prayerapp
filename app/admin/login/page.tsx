"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, LogIn, Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAdminAuth } from "@/lib/auth/use-admin-auth";
import { useTranslation } from "@/lib/i18n/use-translation";

export default function AdminLoginPage() {
  const router = useRouter();
  const { signIn, isAdmin, loading: authLoading } = useAdminAuth();
  const { t } = useTranslation();
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
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-cream)] p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-[var(--color-emerald)] text-[var(--color-gold)]">
            <Shield className="h-8 w-8" aria-hidden="true" />
          </div>
          <h1 className="font-brand text-3xl font-semibold text-[var(--color-emerald)]">Masjid El-Rahman</h1>
          <p className="mt-2 text-sm font-bold text-[var(--color-muted)]">{t("admin.mosqueAdministration")}</p>
        </div>

        {!hasSupabase ? (
          <div className="mb-5 rounded-2xl border border-[var(--color-warning)] bg-[var(--color-gold-soft)] p-4 text-sm font-bold text-[var(--color-warning)]">
            <div className="mb-2 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              {t("admin.setupRequired")}
            </div>
            <p className="font-normal">{t("admin.supabaseEnvMissing")}</p>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="card p-6">
          <h2 className="mb-5 font-brand text-xl font-semibold text-[var(--color-emerald)]">{t("admin.signIn")}</h2>
          <div className="grid gap-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-bold text-[var(--color-emerald)]">{t("admin.email")}</label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-cream)] px-4 py-3 text-sm font-bold text-[var(--color-charcoal)] outline-none focus:border-[var(--color-emerald)]"
                placeholder="admin@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-bold text-[var(--color-emerald)]">{t("admin.password")}</label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-cream)] px-4 py-3 text-sm font-bold text-[var(--color-charcoal)] outline-none focus:border-[var(--color-emerald)]"
                placeholder="••••••••"
              />
            </div>
            {error ? <p className="rounded-2xl bg-[var(--color-danger)]/10 p-3 text-sm font-bold text-[var(--color-danger)]">{error}</p> : null}
            <button
              type="submit"
              disabled={submitting || authLoading}
              className="flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[var(--color-emerald)] text-sm font-bold text-[var(--color-card)] transition active:scale-[0.98] disabled:opacity-50"
            >
              <LogIn className="h-5 w-5" aria-hidden="true" />
              {submitting ? t("admin.signingIn") : t("admin.signIn")}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
