"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AdminSidebar } from "./AdminSidebar";
import { useAdminAuth } from "@/lib/auth/use-admin-auth";
import { useTranslation } from "@/lib/i18n/use-translation";

export function AdminShell({ children, title, titleKey }: { children: ReactNode; title?: string; titleKey?: string }) {
  const router = useRouter();
  const { user, isAdmin, loading, signOut } = useAdminAuth();
  const { t } = useTranslation();
  const displayTitle = titleKey ? t(titleKey) : title || "";

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/admin/login");
      return;
    }
    if (!isAdmin) {
      signOut();
    }
  }, [loading, user, isAdmin, router, signOut]);

  if (loading) {
    return (
      <main className="admin-layout min-h-screen bg-[var(--color-cream)]">
        <div className="flex items-center justify-center p-8">
          <p className="text-sm font-bold text-[var(--color-muted)]">{t("common.loading")}</p>
        </div>
      </main>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <main className="admin-layout min-h-screen bg-[var(--color-cream)]">
      <AdminSidebar />
      <section className="p-4 lg:p-8">
        <div className="mb-6">
          <p className="text-sm font-bold uppercase tracking-[0.08em] text-[var(--color-gold-dark)]">{t("admin.mosqueAdministration")}</p>
          <h1 className="font-brand text-3xl font-semibold text-[var(--color-emerald)]">{displayTitle}</h1>
        </div>
        {children}
      </section>
    </main>
  );
}
