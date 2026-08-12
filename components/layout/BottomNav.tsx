"use client";

import { useMemo, useState, type CSSProperties } from "react";
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
  const { t, locale } = useTranslation();

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

  const routeActiveIndex = navItems.findIndex((item) => isActive(pathname, item.href));
  const [pendingSelection, setPendingSelection] = useState<{ fromPathname: string; index: number } | null>(null);
  const visualActiveIndex = pendingSelection?.fromPathname === pathname
    ? pendingSelection.index
    : routeActiveIndex;

  const logicalIndex = visualActiveIndex < 0 ? 0 : visualActiveIndex;
  const physicalIndex = locale === "ar"
    ? navItems.length - 1 - logicalIndex
    : logicalIndex;
  const trackStyle = {
    "--nav-active-index": physicalIndex,
    "--nav-sidebar-index": logicalIndex,
  } as CSSProperties;

  return (
    <nav aria-label={t("nav.ariaLabel")} className="bottom-nav-shell fixed z-50">
      <div className="bottom-nav-track" style={trackStyle}>
        {visualActiveIndex >= 0 ? <span className="bottom-nav-selection" aria-hidden="true" /> : null}
        {navItems.map((item, index) => {
          const active = isActive(pathname, item.href);
          const visuallyActive = visualActiveIndex === index;
          const Icon = item.icon;
          return (
            <Link
              href={item.href}
              key={item.href}
              aria-current={active ? "page" : undefined}
              onClick={() => setPendingSelection({ fromPathname: pathname, index })}
              className={`bottom-nav-link ${visuallyActive ? "bottom-nav-link-active" : "bottom-nav-link-inactive"}`}
            >
              <Icon className="h-6 w-6" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
