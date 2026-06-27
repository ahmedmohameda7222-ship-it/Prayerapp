"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let registration: ServiceWorkerRegistration | undefined;
    const warmLoadedResources = () => {
      const controller = navigator.serviceWorker.controller;
      if (!controller) return;
      const urls = performance.getEntriesByType("resource")
        .map((entry) => entry.name)
        .filter((value) => {
          try {
            const url = new URL(value);
            return url.origin === window.location.origin && (
              url.pathname.startsWith("/_next/static/") ||
              url.pathname.startsWith("/_next/image") ||
              url.pathname.startsWith("/assets/")
            );
          } catch {
            return false;
          }
        });
      controller.postMessage({ type: "CACHE_RESOURCES", urls });
    };
    const markOfflineReadiness = () => {
      document.documentElement.dataset.offlineReady = navigator.serviceWorker.controller ? "controlled" : "registered";
      warmLoadedResources();
    };
    const register = async () => {
      try {
        registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });
        await navigator.serviceWorker.ready;
        markOfflineReadiness();
      } catch (error) {
        document.documentElement.dataset.offlineReady = "unavailable";
        console.warn("Service worker registration failed", error);
      }
    };
    const updateWhenOnline = () => registration?.update().catch(() => undefined);

    void register();
    window.addEventListener("online", updateWhenOnline);
    window.addEventListener("load", warmLoadedResources);
    navigator.serviceWorker.addEventListener("controllerchange", markOfflineReadiness);
    return () => {
      window.removeEventListener("online", updateWhenOnline);
      window.removeEventListener("load", warmLoadedResources);
      navigator.serviceWorker.removeEventListener("controllerchange", markOfflineReadiness);
    };
  }, []);

  return null;
}
