"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { usePathname } from "next/navigation";
import { RefreshCw } from "lucide-react";

const REFRESH_THRESHOLD = 76;
const MAX_PULL_DISTANCE = 112;
const PULL_DAMPING = 0.52;

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

function hasTouchInput() {
  return navigator.maxTouchPoints > 0 || window.matchMedia("(pointer: coarse)").matches;
}

function blocksPullToRefresh(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest(
    "input, textarea, select, [contenteditable='true'], [data-no-pull-refresh], .bottom-nav-shell"
  ));
}

export function PullToRefresh() {
  const pathname = usePathname();
  const [distance, setDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const refreshingRef = useRef(false);
  const tracking = useRef(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const distanceRef = useRef(0);
  const reloadTimer = useRef<number | null>(null);

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    if (!isStandalone() || !hasTouchInput()) return;

    document.documentElement.dataset.pullRefresh = "enabled";

    const reset = () => {
      tracking.current = false;
      distanceRef.current = 0;
      if (!refreshingRef.current) setDistance(0);
    };

    const onTouchStart = (event: TouchEvent) => {
      if (refreshingRef.current || event.touches.length !== 1 || window.scrollY > 0 || blocksPullToRefresh(event.target)) {
        tracking.current = false;
        return;
      }
      const touch = event.touches[0];
      tracking.current = true;
      startX.current = touch.clientX;
      startY.current = touch.clientY;
      distanceRef.current = 0;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!tracking.current || event.touches.length !== 1) return;
      if (window.scrollY > 0) {
        reset();
        return;
      }

      const touch = event.touches[0];
      const deltaX = touch.clientX - startX.current;
      const deltaY = touch.clientY - startY.current;

      if (deltaY <= 0 || Math.abs(deltaX) > Math.abs(deltaY) * 0.9) {
        if (deltaY < -8 || Math.abs(deltaX) > 12) reset();
        return;
      }

      event.preventDefault();
      const nextDistance = Math.min(MAX_PULL_DISTANCE, deltaY * PULL_DAMPING);
      distanceRef.current = nextDistance;
      setDistance(nextDistance);
    };

    const onTouchEnd = () => {
      if (!tracking.current) return;
      const shouldRefresh = distanceRef.current >= REFRESH_THRESHOLD;
      tracking.current = false;
      distanceRef.current = 0;

      if (!shouldRefresh) {
        setDistance(0);
        return;
      }

      refreshingRef.current = true;
      setDistance(REFRESH_THRESHOLD);
      setRefreshing(true);
      window.dispatchEvent(new Event("pwa-pull-to-refresh"));
      reloadTimer.current = window.setTimeout(() => window.location.reload(), 160);
    };

    const onTouchCancel = () => reset();

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchCancel, { passive: true });

    return () => {
      delete document.documentElement.dataset.pullRefresh;
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchCancel);
      if (reloadTimer.current !== null) window.clearTimeout(reloadTimer.current);
    };
  }, [pathname]);

  const progress = Math.min(distance / REFRESH_THRESHOLD, 1);
  const style = {
    "--pull-refresh-distance": `${Math.max(0, distance - 30)}px`,
    "--pull-refresh-rotation": `${Math.round(progress * 220)}deg`,
  } as CSSProperties;

  return (
    <div
      className="pwa-pull-refresh-indicator"
      data-visible={distance > 1 || refreshing ? "true" : "false"}
      data-refreshing={refreshing ? "true" : "false"}
      style={style}
      aria-hidden="true"
    >
      <RefreshCw className="pwa-pull-refresh-icon" />
    </div>
  );
}
