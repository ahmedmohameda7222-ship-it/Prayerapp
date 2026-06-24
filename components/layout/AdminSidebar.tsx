"use client";

import Link from "next/link";
import { Bell, BookOpen, CalendarDays, Clock, FileClock, HandHeart, LayoutDashboard, LogOut, Settings } from "lucide-react";
import { usePathname } from "next/navigation";
import { MosqueIcon } from "@/components/ui/MosqueIcon";
import { useAdminAuth } from "@/lib/auth/use-admin-auth";

const items = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/prayer-times", label: "Prayer Times", icon: Clock },
  { href: "/admin/jumuah", label: "Jumu'ah", icon: MosqueIcon },
  { href: "/admin/announcements", label: "Announcements", icon: Bell },
  { href: "/admin/donations", label: "Donations", icon: HandHeart },
  { href: "/admin/azkar", label: "Azkar & Duaa", icon: BookOpen },
  { href: "/admin/events", label: "Events", icon: CalendarDays },
  { href: "/admin/ramadan", label: "Ramadan", icon: CalendarDays },
  { href: "/admin/logs", label: "Audit Logs", icon: FileClock },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAdminAuth();

  return (
    <aside className="bg-[var(--color-emerald)] p-4 text-[var(--color-card)] lg:min-h-screen">
      <div className="mb-6 flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-full bg-[var(--color-gold)] text-[var(--color-emerald-dark)]">
          <MosqueIcon className="h-6 w-6" aria-hidden="true" />
        </div>
        <div>
          <p className="font-brand text-xl">Deggendorf Prayer</p>
          <p className="text-xs text-white/70">Admin</p>
        </div>
      </div>

      {user?.email && (
        <div className="mb-4 rounded-2xl bg-white/10 p-3">
          <p className="text-xs text-white/70">Signed in as</p>
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
              {item.label}
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
          Log Out
        </button>
      </div>
    </aside>
  );
}
