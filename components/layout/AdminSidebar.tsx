"use client";

import Link from "next/link";
import { Bell, BookOpen, CalendarDays, Clock, FileClock, HandHeart, LayoutDashboard, LogOut, Settings } from "lucide-react";
import { usePathname } from "next/navigation";
import { MosqueIcon } from "@/components/ui/MosqueIcon";
import { useAdminAuth } from "@/lib/auth/use-admin-auth";
import { useTranslation } from "@/lib/i18n/use-translation";

const items = [
  { href: "/admin", labelKey: "admin.dashboard", icon: LayoutDashboard },
  { href: "/admin/prayer-times", labelKey: "admin.prayerTimes", icon: Clock },
  { href: "/admin/jumuah", labelKey: "admin.jumuah", icon: MosqueIcon },
  { href: "/admin/announcements", labelKey: "admin.announcements", icon: Bell },
  { href: "/admin/donations", labelKey: "admin.donations", icon: HandHeart },
  { href: "/admin/azkar", labelKey: "admin.azkar", icon: BookOpen },
  { href: "/admin/events", labelKey: "admin.events", icon: CalendarDays },
  { href: "/admin/ramadan", labelKey: "admin.ramadan", icon: CalendarDays },
  { href: "/admin/logs", labelKey: "admin.auditLogs", icon: FileClock },
  { href: "/admin/settings", labelKey: "admin.settings", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAdminAuth();
  const { t } = useTranslation();

  return (
    <aside className="bg-[var(--color-emerald)] p-4 text-[var(--color-card)] lg:min-h-screen">
      <div className="mb-6 flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-full bg-[var(--color-gold)] text-[var(--color-emerald-dark)]">
          <MosqueIcon className="h-6 w-6" aria-hidden="true" />
        </div>
        <div>
          <p className="font-brand text-xl">Deggendorf Prayer</p>
          <p className="text-xs text-white/70">{t("admin.admin")}</p>
        </div>
      </div>

      {user?.email && (
        <div className="mb-4 rounded-2xl bg-white/10 p-3">
          <p className="text-xs text-white/70">{t("admin.signedInAs")}</p>
          <p className="text-sm font-bold">{user.email}</p>
        </div>
      )}

      <nav className="grid gap-1">
        {items.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold transition ${active ? "bg-[var(--color-gold)] text-[var(--color-emerald-dark)]" : "text-white/82 hover:bg-white/10"}`}>
              <Icon className="h-5 w-5" aria-hidden="true" />
              {t(item.labelKey)}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 border-t border-white/10 pt-4">
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold text-white/82 transition hover:bg-white/10"
        >
          <LogOut className="h-5 w-5" aria-hidden="true" />
          {t("admin.logOut")}
        </button>
      </div>
    </aside>
  );
}
