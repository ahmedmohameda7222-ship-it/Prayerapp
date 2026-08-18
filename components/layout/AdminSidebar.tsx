"use client";

import Link from "next/link";
import { Bell, CalendarDays, ChevronDown, Clock, HandHeart, LayoutDashboard, LogOut, Settings } from "lucide-react";
import { usePathname } from "next/navigation";
import { MosqueIcon } from "@/components/ui/MosqueIcon";
import { useAdminAuth } from "@/lib/auth/use-admin-auth";
import { useTranslation } from "@/lib/i18n/use-translation";
import { APP_NAMES } from "@/lib/app-brand";

const items = [
  { href: "/admin", labelKey: "admin.dashboard", icon: LayoutDashboard },
  { href: "/admin/prayer-times", labelKey: "admin.prayerTimes", icon: Clock },
  { href: "/admin/jumuah", labelKey: "admin.jumuah", icon: MosqueIcon },
  { href: "/admin/announcements", labelKey: "admin.announcements", icon: Bell },
  { href: "/admin/donations", labelKey: "admin.donations", icon: HandHeart },
  { href: "/admin/events", labelKey: "admin.events", icon: CalendarDays },
  { href: "/admin/ramadan", labelKey: "admin.ramadan", icon: CalendarDays },
  { href: "/admin/settings", labelKey: "admin.settings", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAdminAuth();
  const { t, locale } = useTranslation();

  const nav = (
    <>
      {user?.email ? (
        <div className="mb-3 rounded-[12px] bg-black/5 p-3 text-sm lg:bg-white/10">
          <p className="text-xs opacity-65">{t("admin.signedInAs")}</p>
          <p className="mt-0.5 break-all font-semibold">{user.email}</p>
        </div>
      ) : null}
      <nav className="grid gap-1">
        {items.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-12 items-center gap-3 rounded-[12px] px-3 text-sm font-semibold transition-colors ${
                active
                  ? "bg-[var(--color-emerald-soft)] text-[var(--color-emerald-dark)] lg:bg-[var(--color-gold)] lg:text-[var(--color-emerald-dark)]"
                  : "text-[var(--color-charcoal)] hover:bg-black/5 lg:text-white/82 lg:hover:bg-white/10"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span className="min-w-0 flex-1">{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-4 border-t border-black/10 pt-3 lg:border-white/10">
        <button
          onClick={signOut}
          className="flex min-h-12 w-full items-center gap-3 rounded-[12px] px-3 text-sm font-semibold text-[var(--color-charcoal)] hover:bg-black/5 lg:text-white/82 lg:hover:bg-white/10"
        >
          <LogOut className="h-5 w-5" aria-hidden="true" />
          {t("admin.logOut")}
        </button>
      </div>
    </>
  );

  return (
    <>
      <details className="admin-mobile-menu">
        <summary>
          <span className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--color-emerald-soft)] text-[var(--color-emerald)]">
              <MosqueIcon className="h-4 w-4" aria-hidden="true" />
            </span>
            <span>{t("admin.mosqueAdministration")}</span>
          </span>
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        </summary>
        <div className="px-3 pb-3">{nav}</div>
      </details>

      <aside className="admin-desktop-sidebar bg-[var(--color-emerald)] p-4 text-[var(--color-card)] lg:min-h-screen">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-full bg-[var(--color-gold)] text-[var(--color-emerald-dark)]">
            <MosqueIcon className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <p className="font-brand text-xl">{APP_NAMES[locale]}</p>
            <p className="text-xs text-white/70">{t("admin.admin")}</p>
          </div>
        </div>
        {nav}
      </aside>
    </>
  );
}
