"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Clock, Home, LayoutGrid, Newspaper } from "lucide-react";
import { usePathname } from "next/navigation";
import { MosqueIcon } from "@/components/ui/MosqueIcon";
import { useTranslation } from "@/lib/i18n/use-translation";

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useTranslation();

  const navItems = useMemo(
    () => [
      { href: "/", label: t("nav.home"), icon: Home },
      { href: "/times", label: t("nav.times"), icon: Clock },
      { href: "/friday", label: t("nav.friday"), icon: MosqueIcon },
      { href: "/news", label: t("nav.news"), icon: Newspaper },
      { href: "/more", label: t("nav.more"), icon: LayoutGrid },
    ],
    [t]
  );

  return (
    <nav aria-label={t("nav.ariaLabel")} className="bottom-nav-shell fixed inset-x-0 bottom-0 z-50 mx-auto max-w-[760px] lg:max-w-[1180px]">
      <div className="grid grid-cols-5 gap-1">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              href={item.href}
              key={item.href}
              aria-current={active ? "page" : undefined}
              className={`bottom-nav-link ${active ? "bottom-nav-link-active" : "bottom-nav-link-inactive"}`}
            >
              <Icon className="h-[22px] w-[22px]" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
