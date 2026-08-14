"use client";

import { useEffect } from "react";

type AppPlatform = "ios" | "android" | "other";
type DisplayMode = "standalone" | "browser";

function detectPlatform(): AppPlatform {
  const userAgent = navigator.userAgent.toLowerCase();
  const isIpadOs = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;

  if (/iphone|ipad|ipod/u.test(userAgent) || isIpadOs) return "ios";
  if (/android/u.test(userAgent)) return "android";
  return "other";
}

function detectDisplayMode(): DisplayMode {
  const navigatorStandalone = Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return window.matchMedia("(display-mode: standalone)").matches || navigatorStandalone
    ? "standalone"
    : "browser";
}

export function PlatformAttributes() {
  useEffect(() => {
    const root = document.documentElement;
    const displayModeQuery = window.matchMedia("(display-mode: standalone)");

    const apply = () => {
      root.dataset.platform = detectPlatform();
      root.dataset.displayMode = detectDisplayMode();
    };

    apply();
    displayModeQuery.addEventListener?.("change", apply);

    return () => {
      displayModeQuery.removeEventListener?.("change", apply);
    };
  }, []);

  return null;
}
