"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Link from "next/link";
import { Clock, Home, LayoutGrid, Newspaper, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { MosqueIcon } from "@/components/ui/MosqueIcon";
import { useTranslation } from "@/lib/i18n/use-translation";

const MORE_CHILD_ROUTES = [
  "/account",
  "/privacy",
  "/imprint",
  "/donations",
  "/azkar",
  "/ramadan",
  "/events",
  "/mosque",
  "/qibla",
  "/settings",
] as const;

const ROOT_NAV_HREFS = ["/", "/times", "/friday", "/news", "/more"] as const;
const IOS_DRAG_THRESHOLD = 7;

type RuntimePlatform = "ios" | "android" | "other";

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  startPhysicalIndex: number;
  cellWidth: number;
  dragging: boolean;
};

function detectRuntimePlatform(): RuntimePlatform {
  const ua = navigator.userAgent || "";
  const platform = navigator.platform || "";
  const touchPoints = navigator.maxTouchPoints || 0;
  const ios = /iPhone|iPad|iPod/i.test(ua)
    || (platform === "MacIntel" && touchPoints > 1)
    || (/Macintosh/i.test(ua) && touchPoints > 1)
    || (/AppleWebKit/i.test(ua) && touchPoints > 1 && !/Android/i.test(ua));
  if (ios) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "other";
}

function matchesRoute(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/more") return matchesRoute(pathname, href) || MORE_CHILD_ROUTES.some((route) => matchesRoute(pathname, route));
  return matchesRoute(pathname, href);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

const SIDEBAR_TOGGLE_COPY = {
  ar: { collapse: "طي شريط التنقل", expand: "توسيع شريط التنقل" },
  en: { collapse: "Collapse navigation", expand: "Expand navigation" },
  de: { collapse: "Navigation einklappen", expand: "Navigation erweitern" },
  tr: { collapse: "Gezinmeyi daralt", expand: "Gezinmeyi genişlet" },
} as const;

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { t, locale } = useTranslation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [pendingSelection, setPendingSelection] = useState<{ fromPathname: string; index: number } | null>(null);
  const [dragPosition, setDragPosition] = useState<number | null>(null);
  const [dragCandidateIndex, setDragCandidateIndex] = useState<number | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const runtimePlatformRef = useRef<RuntimePlatform>("other");
  const dragStateRef = useRef<DragState | null>(null);
  const suppressNextClickRef = useRef(false);
  const suppressClickTimerRef = useRef<number | null>(null);

  const navItems = useMemo(
    () => [
      { href: "/", label: t("nav.home"), icon: Home },
      { href: "/times", label: t("nav.times"), icon: Clock },
      { href: "/friday", label: t("nav.friday"), icon: MosqueIcon },
      { href: "/news", label: t("nav.news"), icon: Newspaper },
      { href: "/more", label: t("nav.more"), icon: LayoutGrid },
    ],
    [t],
  );

  useEffect(() => {
    const detected = detectRuntimePlatform();
    runtimePlatformRef.current = detected;
    document.documentElement.dataset.platform = detected;
    navRef.current?.classList.remove("bottom-nav-ios", "bottom-nav-android", "bottom-nav-other");
    navRef.current?.classList.add(`bottom-nav-${detected}`);
  }, []);

  useEffect(() => {
    for (const href of ROOT_NAV_HREFS) {
      router.prefetch(href);
    }
  }, [router]);

  useEffect(() => {
    document.documentElement.dataset.desktopSidebar = sidebarCollapsed ? "collapsed" : "expanded";
    return () => {
      delete document.documentElement.dataset.desktopSidebar;
    };
  }, [sidebarCollapsed]);

  useEffect(() => () => {
    if (suppressClickTimerRef.current !== null) {
      window.clearTimeout(suppressClickTimerRef.current);
    }
  }, []);

  const routeActiveIndex = navItems.findIndex((item) => isActive(pathname, item.href));
  const baseVisualActiveIndex = pendingSelection?.fromPathname === pathname
    ? pendingSelection.index
    : routeActiveIndex;
  const visualActiveIndex = dragCandidateIndex ?? baseVisualActiveIndex;
  const safeBaseIndex = baseVisualActiveIndex < 0 ? 0 : baseVisualActiveIndex;
  const safeVisualIndex = visualActiveIndex < 0 ? 0 : visualActiveIndex;
  const basePhysicalIndex = locale === "ar"
    ? navItems.length - 1 - safeBaseIndex
    : safeBaseIndex;
  const visualPhysicalIndex = locale === "ar"
    ? navItems.length - 1 - safeVisualIndex
    : safeVisualIndex;
  const selectionPosition = dragPosition ?? visualPhysicalIndex;
  const trackStyle = {
    "--nav-active-index": selectionPosition,
    "--nav-sidebar-index": safeVisualIndex,
  } as CSSProperties;
  const toggleCopy = SIDEBAR_TOGGLE_COPY[locale];
  const toggleLabel = sidebarCollapsed ? toggleCopy.expand : toggleCopy.collapse;
  const ToggleIcon = sidebarCollapsed ? PanelLeftOpen : PanelLeftClose;

  function isIosMobileDragEnabled() {
    return runtimePlatformRef.current === "ios" && window.matchMedia("(max-width: 1023px)").matches;
  }

  function physicalToLogicalIndex(physicalIndex: number) {
    return locale === "ar"
      ? navItems.length - 1 - physicalIndex
      : physicalIndex;
  }

  function positionForPointer(clientX: number, state: DragState) {
    const deltaCells = (clientX - state.startX) / state.cellWidth;
    return clamp(state.startPhysicalIndex + deltaCells, 0, navItems.length - 1);
  }

  function clearDrag() {
    dragStateRef.current = null;
    setDragPosition(null);
    setDragCandidateIndex(null);
  }

  function handleTrackPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!isIosMobileDragEnabled() || !event.isPrimary || event.button !== 0) return;

    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    if (rect.width <= 0) return;

    const cellWidth = rect.width / navItems.length;
    const touchedPhysicalIndex = clamp(Math.floor((event.clientX - rect.left) / cellWidth), 0, navItems.length - 1);

    // Drag starts only from the selected Liquid Glass item. Tapping another tab remains a normal Link interaction.
    if (touchedPhysicalIndex !== basePhysicalIndex) return;

    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startPhysicalIndex: basePhysicalIndex,
      cellWidth,
      dragging: false,
    };
  }

  function handleTrackPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const state = dragStateRef.current;
    if (!state || state.pointerId !== event.pointerId) return;

    const dx = event.clientX - state.startX;
    const dy = event.clientY - state.startY;

    if (!state.dragging) {
      if (Math.abs(dy) > IOS_DRAG_THRESHOLD && Math.abs(dy) >= Math.abs(dx)) {
        dragStateRef.current = null;
        return;
      }
      if (Math.abs(dx) < IOS_DRAG_THRESHOLD || Math.abs(dx) <= Math.abs(dy)) return;

      state.dragging = true;
      try {
        trackRef.current?.setPointerCapture(event.pointerId);
      } catch {
        // Pointer capture is an enhancement; the gesture still works without it.
      }
    }

    event.preventDefault();
    const position = positionForPointer(event.clientX, state);
    const candidatePhysicalIndex = Math.round(position);
    setDragPosition(position);
    setDragCandidateIndex(physicalToLogicalIndex(candidatePhysicalIndex));
  }

  function handleTrackPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const state = dragStateRef.current;
    if (!state || state.pointerId !== event.pointerId) return;

    if (!state.dragging) {
      clearDrag();
      return;
    }

    const position = positionForPointer(event.clientX, state);
    const targetPhysicalIndex = Math.round(position);
    const targetLogicalIndex = physicalToLogicalIndex(targetPhysicalIndex);
    const target = navItems[targetLogicalIndex];

    suppressNextClickRef.current = true;
    if (suppressClickTimerRef.current !== null) {
      window.clearTimeout(suppressClickTimerRef.current);
    }
    suppressClickTimerRef.current = window.setTimeout(() => {
      suppressNextClickRef.current = false;
      suppressClickTimerRef.current = null;
    }, 350);

    setPendingSelection({ fromPathname: pathname, index: targetLogicalIndex });
    clearDrag();

    try {
      trackRef.current?.releasePointerCapture(event.pointerId);
    } catch {
      // Ignore if the browser released capture automatically.
    }

    if (pathname !== target.href) {
      router.push(target.href);
    }
  }

  function handleTrackPointerCancel(event: ReactPointerEvent<HTMLDivElement>) {
    const state = dragStateRef.current;
    if (!state || state.pointerId !== event.pointerId) return;
    clearDrag();
  }

  return (
    <nav
      ref={navRef}
      id="primary-navigation"
      aria-label={t("nav.ariaLabel")}
      className="bottom-nav-shell fixed z-50"
    >
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
      <div
        ref={trackRef}
        className="bottom-nav-track"
        style={trackStyle}
        data-ios-dragging={dragPosition !== null ? "true" : undefined}
        onPointerDown={handleTrackPointerDown}
        onPointerMove={handleTrackPointerMove}
        onPointerUp={handleTrackPointerUp}
        onPointerCancel={handleTrackPointerCancel}
      >
        {visualActiveIndex >= 0 ? <span className="bottom-nav-selection" aria-hidden="true" /> : null}
        {navItems.map((item, index) => {
          const active = isActive(pathname, item.href);
          const visuallyActive = visualActiveIndex === index;
          const Icon = item.icon;
          return (
            <Link
              href={item.href}
              prefetch={true}
              key={item.href}
              aria-current={active ? "page" : undefined}
              aria-label={item.label}
              title={sidebarCollapsed ? item.label : undefined}
              draggable={false}
              onClick={(event) => {
                if (suppressNextClickRef.current) {
                  event.preventDefault();
                  suppressNextClickRef.current = false;
                  return;
                }
                setPendingSelection({ fromPathname: pathname, index });
              }}
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
