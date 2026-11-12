"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      void navigator.serviceWorker.getRegistrations().then((registrations) =>
        Promise.all(registrations.map((registration) => registration.unregister()))
      );
      if ("caches" in window) {
        void caches.keys().then((keys) =>
          Promise.all(keys.filter((key) => key.startsWith("deggendorf-prayer")).map((key) => caches.delete(key)))
        );
      }
      return;
    }

    let registration: ServiceWorkerRegistration | undefined;
    let lastOfflineRefreshAt = 0;
    const captureInstallPrompt = (event: Event) => {
      event.preventDefault();
      window.__pwaInstallPrompt = event as BeforeInstallPromptEvent;
      window.dispatchEvent(new Event("pwa-install-available"));
    };
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
    const refreshOfflineSnapshot = () => {
      const worker = navigator.serviceWorker.controller || registration?.active;
      if (!worker || !navigator.onLine || Date.now() - lastOfflineRefreshAt < 15 * 60_000) return;
      lastOfflineRefreshAt = Date.now();
      worker.postMessage({ type: "REFRESH_OFFLINE_PRAYERS" });
    };
    const markOfflineReadiness = () => {
      document.documentElement.dataset.offlineReady = navigator.serviceWorker.controller ? "controlled" : "registered";
      warmLoadedResources();
      refreshOfflineSnapshot();
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
    const updateWhenOnline = () => {
      void registration?.update().catch(() => undefined);
      lastOfflineRefreshAt = 0;
      refreshOfflineSnapshot();
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") refreshOfflineSnapshot();
    };

    void register();
    window.addEventListener("beforeinstallprompt", captureInstallPrompt);
    window.addEventListener("online", updateWhenOnline);
    window.addEventListener("load", warmLoadedResources);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    navigator.serviceWorker.addEventListener("controllerchange", markOfflineReadiness);
    return () => {
      window.removeEventListener("beforeinstallprompt", captureInstallPrompt);
      window.removeEventListener("online", updateWhenOnline);
      window.removeEventListener("load", warmLoadedResources);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      navigator.serviceWorker.removeEventListener("controllerchange", markOfflineReadiness);
    };
  }, []);

  return null;
}
