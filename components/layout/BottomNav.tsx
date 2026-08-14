"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { Clock, Home, LayoutGrid, Newspaper, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { usePathname } from "next/navigation";
import { MosqueIcon } from "@/components/ui/MosqueIcon";
import { useTranslation } from "@/lib/i18n/use-translation";

const MORE_CHILD_ROUTES = [
  "/account",
  "/privacy",
  "/donations",
  "/azkar",
  "/ramadan",
  "/events",
  "/mosque",
  "/qibla",
  "/settings",
] as const;

function matchesRoute(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/more") return matchesRoute(pathname, href) || MORE_CHILD_ROUTES.some((route) => matchesRoute(pathname, route));
  return matchesRoute(pathname, href);
}

const SIDEBAR_TOGGLE_COPY = {
  ar: { collapse: "طي شريط التنقل", expand: "توسيع شريط التنقل" },
  en: { collapse: "Collapse navigation", expand: "Expand navigation" },
  de: { collapse: "Navigation einklappen", expand: "Navigation erweitern" },
  tr: { collapse: "Gezinmeyi daralt", expand: "Gezinmeyi genişlet" },
} as const;

export function BottomNav() {
  const pathname = usePathname();
  const { t, locale } = useTranslation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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

  useEffect(() => {
    document.documentElement.dataset.desktopSidebar = sidebarCollapsed ? "collapsed" : "expanded";
    return () => {
      delete document.documentElement.dataset.desktopSidebar;
    };
  }, [sidebarCollapsed]);

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
  const toggleCopy = SIDEBAR_TOGGLE_COPY[locale];
  const toggleLabel = sidebarCollapsed ? toggleCopy.expand : toggleCopy.collapse;
  const ToggleIcon = sidebarCollapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <nav id="primary-navigation" aria-label={t("nav.ariaLabel")} className="bottom-nav-shell fixed z-50">
      <button
        type="button"
        className="desktop-sidebar-toggle"
        aria-controls="primary-navigation"
        aria-expanded={!sidebarCollapsed}
        aria-label={toggleLabel}
        title={toggleLabel}
        onClick={() => setSidebarCollapsed((current) => !current)}
      >
        <ToggleIcon className="h-5 w-5" aria-hidden="true" />
      </button>
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
              aria-label={item.label}
              title={sidebarCollapsed ? item.label : undefined}
              onClick={() => setPendingSelection({ fromPathname: pathname, index })}
              className={`bottom-nav-link ${visuallyActive ? "bottom-nav-link-active" : "bottom-nav-link-inactive"}`}
            >
              <Icon className="h-6 w-6" aria-hidden="true" />
              <span className="bottom-nav-label">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
